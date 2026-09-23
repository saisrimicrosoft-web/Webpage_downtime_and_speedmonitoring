"""Tests for the Discord webhook alert service."""
from unittest.mock import patch, MagicMock
from app.services.discord_service import DiscordService


def test_send_downtime_alert(app):
    """Test sending a downtime alert via Discord webhook."""
    with app.app_context():
        mock_resp = MagicMock()
        mock_resp.status_code = 204

        with patch('app.services.discord_service.Config') as mock_config, \
             patch('app.services.discord_service.requests.post', return_value=mock_resp) as mock_post:

            mock_config.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test"

            result = DiscordService.send_alert(
                url="https://down.com",
                is_up=False,
                status_code=None,
                response_ms=None,
                reason="Connection failed"
            )

            assert result is True
            mock_post.assert_called_once()
            payload = mock_post.call_args[1]['json']
            assert payload['embeds'][0]['title'] == "🔴 Website DOWN"


def test_send_ssl_warning_alert(app):
    """Test sending an SSL expiry warning via Discord webhook."""
    with app.app_context():
        mock_resp = MagicMock()
        mock_resp.status_code = 204

        with patch('app.services.discord_service.Config') as mock_config, \
             patch('app.services.discord_service.requests.post', return_value=mock_resp) as mock_post:

            mock_config.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test"

            result = DiscordService.send_alert(
                url="https://expiring.com",
                is_up=True,
                ssl_days_left=7
            )

            assert result is True
            payload = mock_post.call_args[1]['json']
            assert "SSL" in payload['embeds'][0]['title']


def test_skip_alert_when_no_webhook(app):
    """Test that alerts are gracefully skipped when webhook URL is not configured."""
    with app.app_context():
        with patch('app.services.discord_service.Config') as mock_config:
            mock_config.DISCORD_WEBHOOK_URL = ""

            result = DiscordService.send_alert(
                url="https://down.com",
                is_up=False,
                reason="Connection failed"
            )

            assert result is False


def test_handle_webhook_failure(app):
    """Test graceful handling when Discord API returns an error."""
    with app.app_context():
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "Bad Request"

        with patch('app.services.discord_service.Config') as mock_config, \
             patch('app.services.discord_service.requests.post', return_value=mock_resp):

            mock_config.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test"

            result = DiscordService.send_alert(
                url="https://down.com",
                is_up=False,
                reason="test"
            )

            assert result is False
