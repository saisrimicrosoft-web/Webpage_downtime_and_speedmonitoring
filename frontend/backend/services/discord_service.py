import requests
import logging
from datetime import datetime, timezone
from config import Config

logger = logging.getLogger(__name__)

class DiscordService:
    """Sends alert notifications to a Discord channel via webhook."""

    @staticmethod
    def send_alert(url: str, is_up: bool, status_code: int = None,
                   response_ms: int = None, ssl_days_left: int = None,
                   reason: str = ""):
        """Send a Discord embed message for downtime or SSL warning."""
        webhook_url = Config.DISCORD_WEBHOOK_URL
        if not webhook_url:
            logger.warning("DISCORD_WEBHOOK_URL not configured. Skipping alert.")
            return False

        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')

        if not is_up:
            # Downtime alert — red
            color = 0xEF4444
            title = "🔴 Website DOWN"
            description = f"**{url}** is unreachable."
            fields = [
                {"name": "Status Code", "value": str(status_code) if status_code else "N/A", "inline": True},
                {"name": "Response Time", "value": f"{response_ms} ms" if response_ms else "Timeout", "inline": True},
                {"name": "Reason", "value": reason or "Connection failed", "inline": False},
                {"name": "Checked At", "value": now, "inline": False},
            ]
        else:
            # SSL expiry warning — yellow
            color = 0xF59E0B
            title = "⚠️ SSL Certificate Warning"
            description = f"**{url}** certificate is expiring soon."
            fields = [
                {"name": "Days Until Expiry", "value": str(ssl_days_left), "inline": True},
                {"name": "Checked At", "value": now, "inline": True},
            ]

        payload = {
            "embeds": [{
                "title": title,
                "description": description,
                "color": color,
                "fields": fields,
                "footer": {"text": "Universal Early Warning System"}
            }]
        }

        try:
            resp = requests.post(webhook_url, json=payload, timeout=10)
            if resp.status_code in (200, 204):
                logger.info(f"Discord alert sent for {url}")
                return True
            else:
                logger.error(f"Discord webhook returned {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {str(e)}")
            return False
