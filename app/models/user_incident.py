from app.utils.time_utils import to_utc_iso
"""
UserIncident model — downtime/degraded incident scoped to a Monitor.
"""
from datetime import datetime, timezone
from app.models import db


class UserIncident(db.Model):
    __tablename__ = 'user_incidents'

    id               = db.Column(db.Integer, primary_key=True)
    monitor_id       = db.Column(db.Integer, db.ForeignKey('monitors.id', ondelete='CASCADE'), nullable=False, index=True)
    started_at       = db.Column(db.DateTime, nullable=False, index=True)
    resolved_at      = db.Column(db.DateTime, nullable=True)
    duration_seconds = db.Column(db.Integer, nullable=True)
    reason           = db.Column(db.String(500), nullable=True)
    status           = db.Column(db.String(20), nullable=False, default='open')  # 'open' | 'resolved'

    monitor = db.relationship('Monitor', back_populates='incidents')

    @property
    def duration_display(self):
        secs = self.duration_seconds
        if secs is None:
            if self.status == 'open' and self.started_at:
                secs = int((datetime.now(timezone.utc) - self.started_at).total_seconds())
            else:
                return 'Ongoing'
        if secs < 60:
            return f'{secs}s'
        elif secs < 3600:
            m, s = divmod(secs, 60)
            return f'{m}m {s}s'
        else:
            h, r = divmod(secs, 3600)
            m, s = divmod(r, 60)
            return f'{h}h {m}m'

    def to_dict(self):
        return {
            'id':               self.id,
            'monitor_id':       self.monitor_id,
            'started_at':       to_utc_iso(self.started_at),
            'resolved_at':      to_utc_iso(self.resolved_at),
            'duration_seconds': self.duration_seconds,
            'duration_display': self.duration_display,
            'reason':           self.reason,
            'status':           self.status,
        }

    def __repr__(self):
        return f'<UserIncident monitor={self.monitor_id} status={self.status}>'
