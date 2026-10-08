"""Tests for the MonitorService — core monitoring engine (Supabase pipeline)."""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
import requests as req_lib


# We must patch the pipeline singletons before each test
@pytest.fixture(autouse=True)
def reset_pipeline():
    """Reset the module-level pipeline singletons before each test."""
    import app.services.monitor as mod
    mod._db_client = None
    mod._alert_manager = None
    mod._init_attempted = False
    yield
    mod._db_client = None
    mod._alert_manager = None
    mod._init_attempted = False


def _make_mock_db():
    """Create a mock MonitoringDatabaseClient."""
    mock_db = MagicMock()
    mock_db.get_or_create_target_by_url.return_value = {
        "id": "test-target-uuid",
        "name": "example.com",
        "url": "https://example.com",
    }
    mock_db.log_check_result.return_value = {
        "id": "test-check-uuid",
    }
    mock_db.get_open_incident.return_value = None
    mock_db.create_incident.return_value = {"id": "test-incident-uuid"}
    mock_db.get_target.return_value = {
        "id": "test-target-uuid",
        "name": "example.com",
        "url": "https://example.com",
    }
    return mock_db


def _make_mock_alerter():
    """Create a mock DiscordAlertManager."""
    mock_alerter = MagicMock()
    return mock_alerter


def test_check_url_success(app):
    """Test monitoring a healthy website (HTTP 200)."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)):

            result = MonitorService_check_url("https://example.com")

            assert result is not None
            # Verify it was stored in Supabase
            mock_db.log_check_result.assert_called_once()
            call_args = mock_db.log_check_result.call_args[0][0]
            assert call_args["is_up"] is True
            assert call_args["status_code"] == 200
            assert call_args["ssl_days_remaining"] == 90


def test_check_url_server_error(app):
    """Test monitoring a website returning HTTP 500."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 60)):

            result = MonitorService_check_url("https://broken.com")

            call_args = mock_db.log_check_result.call_args[0][0]
            assert call_args["is_up"] is False
            assert call_args["status_code"] == 500


def test_check_url_timeout(app):
    """Test monitoring a website that times out."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', side_effect=req_lib.exceptions.Timeout), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(None, None)):

            result = MonitorService_check_url("https://slow.com")

            call_args = mock_db.log_check_result.call_args[0][0]
            assert call_args["is_up"] is False
            assert call_args["status_code"] is None


def test_check_url_connection_error(app):
    """Test monitoring a website with DNS/connection failure."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', side_effect=req_lib.exceptions.ConnectionError), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(False, None)):

            result = MonitorService_check_url("https://nonexistent.invalid")

            call_args = mock_db.log_check_result.call_args[0][0]
            assert call_args["is_up"] is False
            assert call_args["status_code"] is None


def test_check_url_triggers_alert_on_down(app):
    """Test that the AlertManager is called when a site is down."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', side_effect=req_lib.exceptions.ConnectionError), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(False, None)):

            MonitorService_check_url("https://down.com")

            mock_alerter.process_check.assert_called_once()
            alert_payload = mock_alerter.process_check.call_args[0][0]
            assert alert_payload["is_up"] is False


def test_check_url_triggers_alert_on_ssl_warning(app):
    """Test that the AlertManager is called when SSL is expiring soon."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 10)):

            MonitorService_check_url("https://expiring-ssl.com")

            mock_alerter.process_check.assert_called_once()
            alert_payload = mock_alerter.process_check.call_args[0][0]
            assert alert_payload["ssl_days_remaining"] == 10


def test_check_url_http_404(app):
    """Test monitoring a website returning HTTP 404."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)):

            result = MonitorService_check_url("https://missing.com/page")

            call_args = mock_db.log_check_result.call_args[0][0]
            assert call_args["is_up"] is False
            assert call_args["status_code"] == 404


def test_check_all_urls(app):
    """Test checking all URLs from config."""
    mock_db = _make_mock_db()
    mock_alerter = _make_mock_alerter()

    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.get_pipeline', return_value=(mock_db, mock_alerter)), \
             patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)), \
             patch('config.load_urls', return_value=["https://a.com", "https://b.com"]):

            from app.services.monitor import MonitorService
            results = MonitorService.check_all_urls()

            assert len(results) == 2
            assert mock_db.log_check_result.call_count == 2


def test_no_db_client_returns_none(app):
    """Test that check_url returns None when Supabase is not configured."""
    with app.app_context():
        with patch('app.services.monitor.get_pipeline', return_value=(None, None)):
            from app.services.monitor import MonitorService
            result = MonitorService.check_url("https://example.com")
            assert result is None


# Helper to call MonitorService.check_url with the right import
def MonitorService_check_url(url):
    from app.services.monitor import MonitorService
    return MonitorService.check_url(url)
