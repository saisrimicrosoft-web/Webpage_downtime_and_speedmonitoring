import pytest
from run import create_app
from app.models import db


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'test-secret'
    DISCORD_WEBHOOK_URL = ''
    CHECK_INTERVAL_SECONDS = 60
    REQUEST_TIMEOUT_SECONDS = 5
    SSL_WARNING_DAYS = 30


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()
