"""
AlertSetting model — per-user email alert preferences.
"""
from app.models import db


class AlertSetting(db.Model):
    __tablename__ = 'alert_settings'

    id                    = db.Column(db.Integer, primary_key=True)
    user_id               = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    email_alerts_enabled  = db.Column(db.Boolean, nullable=False, default=False)
    alert_email           = db.Column(db.String(255), nullable=True)
    slow_threshold_ms     = db.Column(db.Integer, nullable=False, default=1000)
    notify_on_recovery    = db.Column(db.Boolean, nullable=False, default=True)
    notify_on_ssl_expiry  = db.Column(db.Boolean, nullable=False, default=True)

    user = db.relationship('User', back_populates='alert_settings')

    def to_dict(self):
        return {
            'id':                   self.id,
            'user_id':              self.user_id,
            'email_alerts_enabled': self.email_alerts_enabled,
            'alert_email':          self.alert_email,
            'slow_threshold_ms':    self.slow_threshold_ms,
            'notify_on_recovery':   self.notify_on_recovery,
            'notify_on_ssl_expiry': self.notify_on_ssl_expiry,
        }

    def __repr__(self):
        return f'<AlertSetting user={self.user_id} email_alerts={self.email_alerts_enabled}>'
