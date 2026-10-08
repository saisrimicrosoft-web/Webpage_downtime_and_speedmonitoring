import os
import logging
import requests
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from monitoring_core.db_client import MonitoringDatabaseClient

logger = logging.getLogger(__name__)


class AlertManager:
    """State-aware Webhook alerting engine.

    Evaluates check results against the incidents table to fire rich
    Embeds to Discord, Slack, and Microsoft Teams only on state transitions:
      - UP  → DOWN  (new DOWNTIME incident)
      - DOWN → UP   (resolve DOWNTIME incident)
      - SSL valid → SSL < 14 days / invalid (new SSL_ISSUE incident)
      - SSL invalid → SSL valid (resolve SSL_ISSUE incident)

    Sustained failures are silently deduplicated (anti-spam).
    """

    def __init__(self, db_client: MonitoringDatabaseClient, discord_webhook_url: Optional[str] = None, slack_webhook_url: Optional[str] = None, teams_webhook_url: Optional[str] = None):
        self.discord_webhook_url = discord_webhook_url or os.environ.get("DISCORD_WEBHOOK_URL", "")
        self.slack_webhook_url = slack_webhook_url or os.environ.get("SLACK_WEBHOOK_URL", "")
        self.teams_webhook_url = teams_webhook_url or os.environ.get("TEAMS_WEBHOOK_URL", "")
        self.db = db_client

        if not any([self.discord_webhook_url, self.slack_webhook_url, self.teams_webhook_url]):
            logger.warning("No Webhook URLs configured. AlertManager will track incidents but skip notifications.")

    def broadcast_alert(self, title: str, description: str, color: int, fields: list = None) -> bool:
        """Sends rich messages to all configured webhooks."""
        success = False
        if self.discord_webhook_url and self._send_discord(title, description, color, fields):
            success = True
        if self.slack_webhook_url and self._send_slack(title, description, color, fields):
            success = True
        if self.teams_webhook_url and self._send_teams(title, description, color, fields):
            success = True
        return success

    def _send_discord(self, title: str, description: str, color: int, fields: list = None) -> bool:
        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        payload = {
            "embeds": [{
                "title": title,
                "description": description,
                "color": color,
                "fields": fields or [],
                "footer": {"text": "Universal Early Warning System"},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }]
        }
        try:
            resp = requests.post(self.discord_webhook_url, json=payload, timeout=10)
            if resp.status_code in (200, 204):
                logger.info(f"Discord alert sent: {title}")
                return True
            else:
                logger.error(f"Discord webhook returned {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {e}")
            return False

    def _send_slack(self, title: str, description: str, color: int, fields: list = None) -> bool:
        hex_color = f"#{color:06x}"
        slack_fields = [{"title": f["name"], "value": f["value"], "short": f.get("inline", False)} for f in (fields or [])]
        payload = {
            "attachments": [{
                "color": hex_color,
                "title": title,
                "text": description,
                "fields": slack_fields,
                "footer": "Universal Early Warning System"
            }]
        }
        try:
            resp = requests.post(self.slack_webhook_url, json=payload, timeout=10)
            if resp.status_code in (200, 204):
                logger.info(f"Slack alert sent: {title}")
                return True
            else:
                logger.error(f"Slack webhook returned {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return False

    def _send_teams(self, title: str, description: str, color: int, fields: list = None) -> bool:
        hex_color = f"{color:06x}"
        facts = [{"name": f["name"], "value": str(f["value"])} for f in (fields or [])]
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": hex_color,
            "summary": title,
            "sections": [{
                "activityTitle": title,
                "activitySubtitle": description,
                "facts": facts,
                "markdown": True
            }]
        }
        try:
            resp = requests.post(self.teams_webhook_url, json=payload, timeout=10)
            if resp.status_code in (200, 204):
                logger.info(f"Teams alert sent: {title}")
                return True
            else:
                logger.error(f"Teams webhook returned {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Teams alert: {e}")
            return False

    def evaluate_downtime(self, target: Dict[str, Any], check_result: Dict[str, Any]):
        """Evaluates UP/DOWN state transitions, manages incidents, fires alerts."""
        target_id = target["id"]
        target_name = target.get("name", target.get("url", "Unknown"))
        target_url = target.get("url", "N/A")

        is_up = check_result.get("is_up", False)
        status_code = check_result.get("status_code")
        response_time = check_result.get("response_time_ms")

        open_incident = self.db.get_open_incident(target_id, "DOWNTIME")

        if not is_up and not open_incident:
            # ── Transition: UP → DOWN ──
            details = f"Target {target_name} is DOWN. Status code: {status_code}"
            self.db.create_incident(target_id, "DOWNTIME", details)
            logger.warning(f"INCIDENT OPENED: DOWNTIME for {target_name} ({target_url})")

            self.broadcast_alert(
                title="🚨 MONITOR DOWN 🚨",
                description=f"**{target_name}** is currently unreachable.",
                color=0xFF0000,  # Red
                fields=[
                    {"name": "URL", "value": target_url, "inline": False},
                    {"name": "Status Code", "value": str(status_code or "N/A"), "inline": True},
                    {"name": "Response Time", "value": f"{response_time}ms" if response_time else "Timeout", "inline": True},
                ]
            )

        elif is_up and open_incident:
            # ── Transition: DOWN → UP ──
            self.db.resolve_incident(open_incident["id"])
            logger.info(f"INCIDENT RESOLVED: DOWNTIME for {target_name} ({target_url})")

            self.broadcast_alert(
                title="✅ MONITOR RECOVERED ✅",
                description=f"**{target_name}** is back online.",
                color=0x00FF00,  # Green
                fields=[
                    {"name": "URL", "value": target_url, "inline": False},
                    {"name": "Response Time", "value": f"{response_time}ms" if response_time else "N/A", "inline": True},
                ]
            )

        # If DOWN and open_incident exists → SUSTAINED DOWNTIME (anti-spam: do nothing)
        # If UP and no open_incident    → NORMAL (do nothing)

    def evaluate_ssl(self, target: Dict[str, Any], check_result: Dict[str, Any]):
        """Evaluates SSL certificate state transitions and alerts."""
        target_id = target["id"]
        target_name = target.get("name", target.get("url", "Unknown"))
        target_url = target.get("url", "N/A")

        ssl_valid = check_result.get("ssl_valid")
        days_remaining = check_result.get("ssl_days_remaining")

        # Skip SSL evaluation for non-HTTPS or missing SSL data
        if ssl_valid is None and days_remaining is None:
            return

        needs_alert = (ssl_valid is False) or (
            days_remaining is not None and days_remaining < 14
        )
        open_incident = self.db.get_open_incident(target_id, "SSL_ISSUE")

        if needs_alert and not open_incident:
            # ── SSL is invalid or expiring soon, first occurrence ──
            details = (
                f"SSL Issue for {target_name}. "
                f"Valid: {ssl_valid}, Days remaining: {days_remaining}"
            )
            self.db.create_incident(target_id, "SSL_ISSUE", details)
            logger.warning(f"INCIDENT OPENED: SSL_ISSUE for {target_name} ({target_url})")

            self.broadcast_alert(
                title="⚠️ SSL CERTIFICATE ALERT ⚠️",
                description=f"SSL certificate issue for **{target_name}**.",
                color=0xFFFF00,  # Yellow
                fields=[
                    {"name": "URL", "value": target_url, "inline": False},
                    {"name": "Valid", "value": str(ssl_valid), "inline": True},
                    {"name": "Days Remaining", "value": str(days_remaining if days_remaining is not None else "N/A"), "inline": True},
                ]
            )

        elif not needs_alert and open_incident:
            # ── SSL was fixed / renewed ──
            self.db.resolve_incident(open_incident["id"])
            logger.info(f"INCIDENT RESOLVED: SSL_ISSUE for {target_name} ({target_url})")

            self.broadcast_alert(
                title="🔒 SSL CERTIFICATE RESTORED 🔒",
                description=f"SSL certificate for **{target_name}** is healthy again.",
                color=0x00FF00,  # Green
                fields=[
                    {"name": "URL", "value": target_url, "inline": False},
                    {"name": "Days Remaining", "value": str(days_remaining if days_remaining is not None else "N/A"), "inline": True},
                ]
            )

        # If needs_alert and open_incident exists → SUSTAINED SSL ISSUE (anti-spam)
        # If not needs_alert and no open_incident → NORMAL

    def process_check(self, check_result: Dict[str, Any]):
        """Main entry point. Evaluates a check result for state transitions.

        Call this after logging a check result to the database.
        The check_result dict must include 'target_id'.
        """
        target_id = check_result.get("target_id")
        if not target_id:
            logger.error("process_check called without target_id — skipping.")
            return

        target = self.db.get_target(target_id)
        if not target:
            logger.error(f"Target {target_id} not found in DB — skipping alerts.")
            return

        self.evaluate_downtime(target, check_result)
        self.evaluate_ssl(target, check_result)
