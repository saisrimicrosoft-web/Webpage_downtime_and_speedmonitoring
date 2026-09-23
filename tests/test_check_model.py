"""Tests for the Check model (CHECKS table)."""
from app.models.check import Check
from app.models import db
from datetime import datetime, timezone


def test_check_creation(app):
    """Test that a Check row can be created with all ER diagram columns."""
    with app.app_context():
        check = Check(
            url="https://example.com",
            checked_at=datetime.now(timezone.utc),
            status_code=200,
            response_ms=150,
            is_up=True,
            ssl_days_left=90
        )
        db.session.add(check)
        db.session.commit()

        saved = Check.query.first()
        assert saved is not None
        assert saved.url == "https://example.com"
        assert saved.status_code == 200
        assert saved.response_ms == 150
        assert saved.is_up is True
        assert saved.ssl_days_left == 90


def test_check_down_state(app):
    """Test creating a check for a down website."""
    with app.app_context():
        check = Check(
            url="https://broken.example.com",
            checked_at=datetime.now(timezone.utc),
            status_code=None,
            response_ms=5000,
            is_up=False,
            ssl_days_left=None
        )
        db.session.add(check)
        db.session.commit()

        saved = Check.query.first()
        assert saved.is_up is False
        assert saved.status_code is None
        assert saved.ssl_days_left is None


def test_check_to_dict(app):
    """Test the to_dict serialization method."""
    with app.app_context():
        check = Check(
            url="https://example.com",
            checked_at=datetime(2025, 1, 15, 12, 0, 0, tzinfo=timezone.utc),
            status_code=200,
            response_ms=100,
            is_up=True,
            ssl_days_left=45
        )
        db.session.add(check)
        db.session.commit()

        d = check.to_dict()
        assert d['url'] == "https://example.com"
        assert d['status_code'] == 200
        assert d['response_ms'] == 100
        assert d['is_up'] is True
        assert d['ssl_days_left'] == 45
        assert d['checked_at'] is not None


def test_multiple_checks_per_url(app):
    """Test storing multiple checks for the same URL (time-series)."""
    with app.app_context():
        for i in range(5):
            check = Check(
                url="https://example.com",
                checked_at=datetime.now(timezone.utc),
                status_code=200,
                response_ms=100 + i * 10,
                is_up=True,
                ssl_days_left=90
            )
            db.session.add(check)
        db.session.commit()

        checks = Check.query.filter_by(url="https://example.com").all()
        assert len(checks) == 5
