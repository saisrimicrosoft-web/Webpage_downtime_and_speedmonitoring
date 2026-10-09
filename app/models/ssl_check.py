from app.utils.time_utils import to_utc_iso
from app.models import db
from datetime import datetime, timezone

class SSLCheck(db.Model):
    __tablename__ = 'ssl_checks'

    id = db.Column(db.Integer, primary_key=True)
    monitor_id = db.Column(db.Integer, db.ForeignKey('monitors.id', ondelete='CASCADE'), nullable=False)
    checked_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    status = db.Column(db.String(50), nullable=False)
    issuer = db.Column(db.String(500))
    subject = db.Column(db.String(500))
    valid_from = db.Column(db.DateTime)
    valid_to = db.Column(db.DateTime)
    days_left = db.Column(db.Integer)
    protocol = db.Column(db.String(50))
    cipher = db.Column(db.String(100))
    san_match = db.Column(db.Boolean, default=False)
    chain_json = db.Column(db.Text)
    hsts = db.Column(db.Boolean, default=False)
    error_message = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'monitor_id': self.monitor_id,
            'checked_at': to_utc_iso(self.checked_at),
            'status': self.status,
            'issuer': self.issuer,
            'subject': self.subject,
            'valid_from': to_utc_iso(self.valid_from),
            'valid_to': to_utc_iso(self.valid_to),
            'days_left': self.days_left,
            'protocol': self.protocol,
            'cipher': self.cipher,
            'san_match': self.san_match,
            'chain_json': self.chain_json,
            'hsts': self.hsts,
            'error_message': self.error_message
        }
