"""Tests for the MonitorService — core monitoring engine."""
import pytest
from unittest.mock import patch, MagicMock
from app.services.monitor import MonitorService
from app.models.check import Check
from app.models import db


def test_check_url_success(app):
    """Test monitoring a healthy website (HTTP 200)."""
    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.requests.get', return_value=mock_response) as mock_get, \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)):

            result = MonitorService.check_url("https://example.com")

            assert result.is_up is True
            assert result.status_code == 200
            assert result.ssl_days_left == 90
            assert result.url == "https://example.com"

            # Verify it was saved to DB
            saved = Check.query.first()
            assert saved is not None
            assert saved.is_up is True


def test_check_url_server_error(app):
    """Test monitoring a website returning HTTP 500."""
    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 60)):

            result = MonitorService.check_url("https://broken.com")

            assert result.is_up is False
            assert result.status_code == 500


def test_check_url_timeout(app):
    """Test monitoring a website that times out."""
    import requests

    with app.app_context():
        with patch('app.services.monitor.requests.get', side_effect=requests.exceptions.Timeout), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(None, None)):

            result = MonitorService.check_url("https://slow.com")

            assert result.is_up is False
            assert result.status_code is None


def test_check_url_connection_error(app):
    """Test monitoring a website with DNS/connection failure."""
    import requests

    with app.app_context():
        with patch('app.services.monitor.requests.get', side_effect=requests.exceptions.ConnectionError), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(False, None)):

            result = MonitorService.check_url("https://nonexistent.invalid")

            assert result.is_up is False
            assert result.status_code is None


def test_check_url_sends_discord_on_down(app):
    """Test that a Discord alert is sent when a site is down."""
    import requests

    with app.app_context():
        with patch('app.services.monitor.requests.get', side_effect=requests.exceptions.ConnectionError), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(False, None)), \
             patch('app.services.monitor.DiscordService.send_alert') as mock_discord:

            MonitorService.check_url("https://down.com")

            mock_discord.assert_called_once()
            call_kwargs = mock_discord.call_args
            assert call_kwargs[1]['is_up'] is False


def test_check_url_sends_discord_on_ssl_warning(app):
    """Test that a Discord alert is sent when SSL is expiring soon."""
    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 10)), \
             patch('app.services.monitor.DiscordService.send_alert') as mock_discord:

            MonitorService.check_url("https://expiring-ssl.com")

            # Should be called for SSL warning
            mock_discord.assert_called_once()
            call_kwargs = mock_discord.call_args
            assert call_kwargs[1]['ssl_days_left'] == 10


def test_check_url_http_404(app):
    """Test monitoring a website returning HTTP 404."""
    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 404

        with patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)):

            result = MonitorService.check_url("https://missing.com/page")

            assert result.is_up is False
            assert result.status_code == 404


def test_check_all_urls(app):
    """Test checking all URLs from config."""
    with app.app_context():
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch('app.services.monitor.requests.get', return_value=mock_response), \
             patch('app.services.monitor.SSLService.check_ssl', return_value=(True, 90)), \
             patch('config.load_urls', return_value=["https://a.com", "https://b.com"]):

            results = MonitorService.check_all_urls()

            assert len(results) == 2
            assert all(r.is_up for r in results)
