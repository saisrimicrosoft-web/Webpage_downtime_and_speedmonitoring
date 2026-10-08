"""
Incident model — Groups consecutive check failures into a single incident.

Lifecycle:
    HEALTHY → failure detected → Incident(status='open') created
    → more failures → same incident updated
    → recovery detected → Incident.recovered_at set, status='resolved'
"""

from app.models import db
from datetime import datetime, timezone


class Incident(db.Model):
    """Tracks downtime/degraded incidents grouped from monitoring checks."""
    __tablename__ = 'incidents'

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False, index=True)

    # Incident state: 'open' or 'resolved'
    status = db.Column(db.String(20), nullable=False, default='open', index=True)

    # Severity: 'down' or 'degraded'
    severity = db.Column(db.String(20), nullable=False, default='down')

    # Timestamps
    started_at = db.Column(db.DateTime, nullable=False, index=True)
    detected_at = db.Column(db.DateTime, nullable=False)
    recovered_at = db.Column(db.DateTime, nullable=True)

    # Duration in seconds (calculated on recovery)
    duration_seconds = db.Column(db.Integer, nullable=True)

    # Detection context
    region = db.Column(db.String(100), nullable=True, default='Primary')
    http_status = db.Column(db.Integer, nullable=True)
    response_ms = db.Column(db.Integer, nullable=True)
    error_message = db.Column(db.String(500), nullable=True)

    # Number of failed checks in this incident
    failure_count = db.Column(db.Integer, nullable=False, default=1)

    # Last check ID associated (for linking)
    last_check_id = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Incident {self.url} {self.severity} {self.status} started={self.started_at}>"

    @property
    def duration_display(self):
        """Human-readable duration string."""
        if self.duration_seconds is None:
            if self.status == 'open' and self.started_at:
                elapsed = (datetime.now(timezone.utc) - self.started_at).total_seconds()
                return self._format_duration(int(elapsed))
            return 'Ongoing'
        return self._format_duration(self.duration_seconds)

    @staticmethod
    def _format_duration(seconds):
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            m, s = divmod(seconds, 60)
            return f"{m}m {s}s"
        else:
            h, remainder = divmod(seconds, 3600)
            m, s = divmod(remainder, 60)
            return f"{h}h {m}m"

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'status': self.status,
            'severity': self.severity,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'recovered_at': self.recovered_at.isoformat() if self.recovered_at else None,
            'duration_seconds': self.duration_seconds,
            'duration_display': self.duration_display,
            'region': self.region,
            'http_status': self.http_status,
            'response_ms': self.response_ms,
            'error_message': self.error_message,
            'failure_count': self.failure_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
