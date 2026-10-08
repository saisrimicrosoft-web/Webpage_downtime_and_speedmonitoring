"""
UserCheck model — a single check result scoped to a Monitor (and therefore a User).
Parallel to the legacy Check model but linked via monitor_id for user isolation.
"""
from datetime import datetime, timezone
from app.models import db


class UserCheck(db.Model):
    __tablename__ = 'user_checks'

    id            = db.Column(db.Integer, primary_key=True)
    monitor_id    = db.Column(db.Integer, db.ForeignKey('monitors.id', ondelete='CASCADE'), nullable=False, index=True)
    timestamp     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    status        = db.Column(db.String(10), nullable=False, default='down')   # 'up' | 'down'
    http_status_code = db.Column(db.Integer, nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    error_message    = db.Column(db.String(500), nullable=True)
    ssl_days_left    = db.Column(db.Integer, nullable=True)

    monitor = db.relationship('Monitor', back_populates='checks')

    @property
    def is_up(self):
        return self.status == 'up'

    def to_dict(self):
        return {
            'id':               self.id,
            'monitor_id':       self.monitor_id,
            'timestamp':        self.timestamp.isoformat() if self.timestamp else None,
            'status':           self.status,
            'is_up':            self.is_up,
            'http_status_code': self.http_status_code,
            'response_time_ms': self.response_time_ms,
            'error_message':    self.error_message,
            'ssl_days_left':    self.ssl_days_left,
        }

    def __repr__(self):
        return f'<UserCheck monitor={self.monitor_id} status={self.status} at={self.timestamp}>'
