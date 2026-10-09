import logging
import threading
import smtplib
import json
import requests
from email.message import EmailMessage
from datetime import datetime, timezone
import os

from app.models import db
from app.models.alert import Alert, AlertRule, NotificationChannel, NotificationLog
from app.models.check import Check

logger = logging.getLogger(__name__)

class AlertEngine:
    @staticmethod
    def process_check(check: Check):
        """Processes a single check result to determine if an alert should be opened, updated, or resolved."""
        website_id = check.url

        # Get rules (prefer specific over global)
        rule = AlertRule.query.filter_by(website_id=website_id).first()
        if not rule:
            rule = AlertRule.query.filter_by(website_id=None).first()
        
        if not rule or not rule.enabled:
            return # No rules enabled

        status = 'up'
        if not check.is_up:
            status = 'down'
        elif check.response_ms and check.response_ms > rule.slow_response_ms:
            status = 'slow'
        elif check.ssl_days_left is not None and check.ssl_days_left <= rule.ssl_warning_days:
            status = 'ssl_warning'
            
        now = datetime.now(timezone.utc)

        if status == 'up':
            # Resolve any active down or slow alerts
            active_alerts = Alert.query.filter(Alert.website_id == website_id, Alert.status == 'active', Alert.type.in_(['down', 'slow_response'])).all()
            for alert in active_alerts:
                alert.status = 'resolved'
                alert.resolved_at = now
                if alert.started_at:
                    alert.duration_seconds = int((now - alert.started_at.replace(tzinfo=timezone.utc)).total_seconds())
                logger.info(f"Resolved alert {alert.id} for {website_id}")
            db.session.commit()
            return

        # Determine type and severity
        alert_type = 'down'
        severity = 'critical'
        
        if status == 'down':
            alert_type = 'down'
            severity = 'critical'
        elif status == 'slow':
            alert_type = 'slow_response'
            severity = 'warning'
        elif status == 'ssl_warning':
            alert_type = 'ssl_expiring'
            severity = 'critical' if check.ssl_days_left <= 3 else 'warning'

        # Fetch recent checks for consecutive failures threshold (only relevant for 'down')
        if alert_type == 'down':
            recent_checks = Check.query.filter_by(url=website_id).order_by(Check.checked_at.desc()).limit(rule.consecutive_failures_threshold).all()
            down_count = sum(1 for c in recent_checks if not c.is_up)
            if down_count < rule.consecutive_failures_threshold:
                return # Threshold not met yet

        # Check if active alert already exists for this type and website
        existing_alert = Alert.query.filter_by(website_id=website_id, status='active', type=alert_type).first()
        if existing_alert:
            # Upgrade severity if necessary (e.g. ssl warning -> critical)
            if severity == 'critical' and existing_alert.severity != 'critical':
                existing_alert.severity = 'critical'
                db.session.commit()
            return # Dedupe

        # Create new alert
        error_msg = None
        if alert_type == 'down':
            if check.status_code == -1 or check.status_code is None:
                error_msg = "Connection failed or timed out"
            else:
                error_msg = f"HTTP {check.status_code}"
        elif alert_type == 'slow_response':
            error_msg = f"Response time {check.response_ms}ms exceeded {rule.slow_response_ms}ms"
        elif alert_type == 'ssl_expiring':
            error_msg = f"SSL certificate expires in {check.ssl_days_left} days"

        title = f"[{severity.upper()}] {website_id} is {alert_type.replace('_', ' ')}"
        
        new_alert = Alert(
            website_id=website_id,
            type=alert_type,
            severity=severity,
            status='active',
            title=title,
            message=f"Detected at {now.isoformat()}",
            http_code=check.status_code,
            response_time_ms=check.response_ms,
            error_message=error_msg,
            started_at=now
        )
        db.session.add(new_alert)
        db.session.commit()
        
        logger.info(f"Created new {severity} alert {new_alert.id} for {website_id}")

        # Trigger notifications in background
        threading.Thread(target=AlertEngine.send_notifications, args=(new_alert.id,)).start()

    @staticmethod
    def send_notifications(alert_id):
        # We need a new app context for the background thread
        from run import create_app
        app = create_app()
        with app.app_context():
            alert = Alert.query.get(alert_id)
            if not alert:
                return

            channels = NotificationChannel.query.filter_by(enabled=True).all()
            notified = []

            for channel in channels:
                log = NotificationLog(alert_id=alert.id, channel_id=channel.id)
                
                if channel.type == 'in_app':
                    log.status = 'sent'
                    notified.append('in_app')
                elif channel.type == 'email':
                    success, err = AlertEngine._send_email(alert, channel.target)
                    log.status = 'sent' if success else 'failed'
                    log.error = err
                    if success: notified.append('email')
                elif channel.type in ['webhook', 'slack']:
                    success, err = AlertEngine._send_webhook(alert, channel.target)
                    log.status = 'sent' if success else 'failed'
                    log.error = err
                    if success: notified.append(channel.type)
                
                db.session.add(log)

            alert.notified_channels = ",".join(notified)
            db.session.commit()

    @staticmethod
    def _send_email(alert, target):
        host = os.environ.get('SMTP_HOST')
        port = os.environ.get('SMTP_PORT')
        user = os.environ.get('SMTP_USER')
        password = os.environ.get('SMTP_PASS')
        from_addr = os.environ.get('ALERT_FROM', 'alerts@nexora.local')

        if not all([host, port]):
            return False, "SMTP credentials missing, simulated."
            
        try:
            msg = EmailMessage()
            msg.set_content(f"{alert.title}\n{alert.message}\n{alert.error_message}")
            msg['Subject'] = alert.title
            msg['From'] = from_addr
            msg['To'] = target

            with smtplib.SMTP(host, int(port)) as s:
                if user and password:
                    s.login(user, password)
                s.send_message(msg)
            return True, None
        except Exception as e:
            return False, str(e)

    @staticmethod
    def _send_webhook(alert, target):
        if not target.startswith('http'):
            return False, "Invalid webhook URL, simulated."
            
        payload = {
            "text": f"{alert.title}\n{alert.message}\nError: {alert.error_message}"
        }
        try:
            res = requests.post(target, json=payload, timeout=5)
            if res.ok:
                return True, None
            return False, f"HTTP {res.status_code}"
        except Exception as e:
            return False, str(e)
