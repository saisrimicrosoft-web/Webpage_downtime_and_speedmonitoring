from app.utils.time_utils import to_utc_iso
"""
Monitor model — a user-owned URL to watch.
Replaces the flat urls.json list; every URL belongs to exactly one user.
"""
from datetime import datetime, timezone
from app.models import db


class Monitor(db.Model):
    __tablename__ = 'monitors'

    id                    = db.Column(db.Integer, primary_key=True)
    user_id               = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    name                  = db.Column(db.String(255), nullable=False)
    url                   = db.Column(db.String(2048), nullable=False)
    check_interval_seconds = db.Column(db.Integer, nullable=False, default=60)
    timeout_seconds       = db.Column(db.Integer, nullable=False, default=10)
    expected_status_code  = db.Column(db.Integer, nullable=False, default=200)
    is_active             = db.Column(db.Boolean, nullable=False, default=True)
    created_at            = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ssl_expires_at        = db.Column(db.DateTime, nullable=True)
    ssl_status            = db.Column(db.String(50), nullable=True)
    # Relationships
    user      = db.relationship('User',      back_populates='monitors')
    checks    = db.relationship('UserCheck',    back_populates='monitor', cascade='all, delete-orphan', lazy='dynamic')
    incidents = db.relationship('UserIncident', back_populates='monitor', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self, latest_check=None):
        d = {
            'id':                     self.id,
            'user_id':                self.user_id,
            'name':                   self.name,
            'url':                    self.url,
            'check_interval_seconds': self.check_interval_seconds,
            'timeout_seconds':        self.timeout_seconds,
            'expected_status_code':   self.expected_status_code,
            'is_active':              self.is_active,
            'created_at':             to_utc_iso(self.created_at),
        }
        if latest_check:
            d['latest_check'] = latest_check
        return d

    def __repr__(self):
        return f'<Monitor {self.name} ({self.url})>'
