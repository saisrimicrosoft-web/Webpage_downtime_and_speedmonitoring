from app.utils.time_utils import to_utc_iso
from app.models import db
from datetime import datetime, timezone

class Check(db.Model):
    """Single CHECKS table matching the college ER diagram exactly."""
    __tablename__ = 'checks'
    __table_args__ = (
        db.Index('idx_url_checked_at', 'url', 'checked_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False, index=True)
    checked_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    status_code = db.Column(db.Integer, nullable=True)
    response_ms = db.Column(db.Integer, nullable=True)
    is_up = db.Column(db.Boolean, nullable=False, default=False)
    ssl_days_left = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f"<Check {self.url} - up={self.is_up} - {self.checked_at}>"

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'checked_at': to_utc_iso(self.checked_at),
            'status_code': self.status_code,
            'response_ms': self.response_ms,
            'is_up': self.is_up,
            'ssl_days_left': self.ssl_days_left
        }
