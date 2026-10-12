from app.utils.time_utils import to_utc_iso
"""
User model — stores registered accounts with bcrypt-hashed passwords.
"""
from datetime import datetime, timezone
from app.models import db

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(120), nullable=False, default="DevOps Admin")
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True, default="admin@example.com")
    password_hash = db.Column(db.String(255), nullable=True)
    avatar_url    = db.Column(db.String(500), nullable=True)
    avatar_path   = db.Column(db.String(255), nullable=True)
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    monitors       = db.relationship('Monitor',      back_populates='user', cascade='all, delete-orphan', lazy='dynamic')
    alert_settings = db.relationship('AlertSetting', back_populates='user', cascade='all, delete-orphan', uselist=False)

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'avatar_url': self.avatar_url,
            'avatar_path': self.avatar_path,
            'created_at': to_utc_iso(self.created_at),
        }

    def __repr__(self):
        return f'<User {self.email}>'
