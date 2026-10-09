"""
UserMonitorService — runs HTTP+SSL checks for all active user Monitors,
saves UserCheck results, manages UserIncidents, and fires email alerts.
"""
import logging
import time
import requests as req_lib
from datetime import datetime, timezone

from app.models import db
from app.models.monitor import Monitor
from app.models.user_check import UserCheck
from app.models.user_incident import UserIncident
from app.models.alert_setting import AlertSetting
from app.services.ssl_service import SSLService
from app.services.email_service import (
    send_downtime_alert, send_recovery_alert, send_ssl_alert
)
from config import Config

logger = logging.getLogger(__name__)


class UserMonitorService:

    @staticmethod
    def check_monitor(monitor: Monitor) -> UserCheck:
        """Run a single HTTP+SSL check for *monitor*, persist and return UserCheck."""
        start = time.time()
        is_up        = False
        status_code  = None
        error_msg    = None
        ssl_days     = None

        # ── HTTP check ──────────────────────────────────────────────────────
        try:
            resp = req_lib.get(
                monitor.url,
                timeout=monitor.timeout_seconds,
                headers={'User-Agent': 'UniversalMonitor/2.0'},
                allow_redirects=True,
            )
            status_code = resp.status_code
            is_up = (monitor.expected_status_code - 50 <= status_code <= monitor.expected_status_code + 50) \
                    or (200 <= status_code <= 299)
        except req_lib.exceptions.Timeout:
            error_msg = 'Request timed out'
        except req_lib.exceptions.ConnectionError as e:
            error_msg = f'Connection error: {str(e)[:120]}'
        except req_lib.exceptions.RequestException as e:
            error_msg = f'Request failed: {str(e)[:120]}'

        response_ms = int((time.time() - start) * 1000)

        # ── SSL check ───────────────────────────────────────────────────────
        if monitor.url.startswith('https://'):
            _, ssl_days = SSLService.check_ssl(monitor.url)

        # ── Persist check ───────────────────────────────────────────────────
        check = UserCheck(
            monitor_id       = monitor.id,
            status           = 'up' if is_up else 'down',
            http_status_code = status_code,
            response_time_ms = response_ms,
            error_message    = error_msg,
            ssl_days_left    = ssl_days,
        )
        db.session.add(check)
        db.session.flush()   # get check.id before incident processing

        # ── Incident management ─────────────────────────────────────────────
        UserMonitorService._handle_incidents(monitor, check, is_up, error_msg)

        db.session.commit()
        logger.info(
            f'[Monitor {monitor.id}] {monitor.url} up={is_up} '
            f'{response_ms}ms ssl={ssl_days}'
        )
        return check

    @staticmethod
    def _handle_incidents(monitor: Monitor, check: UserCheck, is_up: bool, error_msg: str):
        """Open or resolve a UserIncident and fire email alerts."""
        open_inc = (
            UserIncident.query
            .filter_by(monitor_id=monitor.id, status='open')
            .order_by(UserIncident.started_at.desc())
            .first()
        )
        now = datetime.now(timezone.utc)

        if not is_up:
            if open_inc is None:
                # New incident
                inc = UserIncident(
                    monitor_id = monitor.id,
                    started_at = now,
                    reason     = error_msg or f'HTTP {check.http_status_code}',
                    status     = 'open',
                )
                db.session.add(inc)
                # Email alert
                UserMonitorService._maybe_send_downtime(monitor, error_msg)
        else:
            if open_inc is not None:
                # Resolve
                open_inc.status           = 'resolved'
                open_inc.resolved_at      = now
                open_inc.duration_seconds = int((now - open_inc.started_at).total_seconds())
                # Email alert
                UserMonitorService._maybe_send_recovery(monitor, check.response_time_ms)

        # SSL expiry alert
        if check.ssl_days_left is not None and 0 < check.ssl_days_left <= Config.SSL_WARNING_DAYS:
            UserMonitorService._maybe_send_ssl(monitor, check.ssl_days_left)

    # ── Email helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _get_alert_settings(monitor: Monitor):
        return AlertSetting.query.filter_by(user_id=monitor.user_id).first()

    @staticmethod
    def _maybe_send_downtime(monitor: Monitor, error: str):
        s = UserMonitorService._get_alert_settings(monitor)
        if s and s.email_alerts_enabled and s.alert_email:
            send_downtime_alert(s.alert_email, monitor.name, monitor.url, error)

    @staticmethod
    def _maybe_send_recovery(monitor: Monitor, response_ms: int):
        s = UserMonitorService._get_alert_settings(monitor)
        if s and s.email_alerts_enabled and s.alert_email and s.notify_on_recovery:
            send_recovery_alert(s.alert_email, monitor.name, monitor.url, response_ms)

    @staticmethod
    def _maybe_send_ssl(monitor: Monitor, days_left: int):
        s = UserMonitorService._get_alert_settings(monitor)
        if s and s.email_alerts_enabled and s.alert_email and s.notify_on_ssl_expiry:
            send_ssl_alert(s.alert_email, monitor.name, monitor.url, days_left)

    # ── Bulk check (called by scheduler) ────────────────────────────────────

    @staticmethod
    def check_all_monitors():
        """Check every active Monitor across all users."""
        monitors = Monitor.query.filter_by(is_active=True).all()
        logger.info(f'Scheduler: checking {len(monitors)} active monitors')
        for monitor in monitors:
            try:
                UserMonitorService.check_monitor(monitor)
            except Exception as e:
                logger.error(f'Error checking monitor {monitor.id} ({monitor.url}): {e}')
