"""
User model — stores registered accounts with bcrypt-hashed passwords.
"""
from datetime import datetime, timezone
from app.models import db


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(120), nullable=False)
    email         = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_url    = db.Column(db.String(500), nullable=True)
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<User {self.email}>'
