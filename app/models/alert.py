from app.utils.time_utils import to_utc_iso
from app.models import db
from datetime import datetime, timezone

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    website_id = db.Column(db.String(500), nullable=False, index=True) # Corresponds to url
    type = db.Column(db.String(50), nullable=False) # 'down', 'degraded', 'ssl_expiring', 'slow_response'
    severity = db.Column(db.String(20), nullable=False) # 'critical', 'warning', 'info'
    status = db.Column(db.String(20), nullable=False, default='active') # 'active', 'acknowledged', 'resolved'
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=True)
    http_code = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    acknowledged_by = db.Column(db.String(100), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Integer, nullable=True)
    notified_channels = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'website_id': self.website_id,
            'type': self.type,
            'severity': self.severity,
            'status': self.status,
            'title': self.title,
            'message': self.message,
            'http_code': self.http_code,
            'response_time_ms': self.response_time_ms,
            'error_message': self.error_message,
            'started_at': to_utc_iso(self.started_at),
            'acknowledged_at': to_utc_iso(self.acknowledged_at),
            'acknowledged_by': self.acknowledged_by,
            'resolved_at': to_utc_iso(self.resolved_at),
            'duration_seconds': self.duration_seconds,
            'notified_channels': self.notified_channels
        }

class AlertRule(db.Model):
    __tablename__ = 'alert_rules'

    id = db.Column(db.Integer, primary_key=True)
    website_id = db.Column(db.String(500), nullable=True, index=True) # NULL for global
    consecutive_failures_threshold = db.Column(db.Integer, default=2)
    slow_response_ms = db.Column(db.Integer, default=2000)
    ssl_warning_days = db.Column(db.Integer, default=14)
    cooldown_minutes = db.Column(db.Integer, default=15)
    enabled = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'website_id': self.website_id,
            'consecutive_failures_threshold': self.consecutive_failures_threshold,
            'slow_response_ms': self.slow_response_ms,
            'ssl_warning_days': self.ssl_warning_days,
            'cooldown_minutes': self.cooldown_minutes,
            'enabled': self.enabled
        }

class NotificationChannel(db.Model):
    __tablename__ = 'notification_channels'

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False) # 'email', 'webhook', 'slack', 'in_app'
    target = db.Column(db.String(500), nullable=False)
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'target': self.target,
            'enabled': self.enabled,
            'created_at': to_utc_iso(self.created_at)
        }

class NotificationLog(db.Model):
    __tablename__ = 'notification_log'

    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.Integer, db.ForeignKey('alerts.id'), nullable=False)
    channel_id = db.Column(db.Integer, db.ForeignKey('notification_channels.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False) # 'sent', 'failed', 'simulated'
    error = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'channel_id': self.channel_id,
            'status': self.status,
            'error': self.error,
            'sent_at': to_utc_iso(self.sent_at)
        }
