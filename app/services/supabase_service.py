import logging
import requests
from datetime import datetime, timezone
from config import Config

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service to handle syncing monitoring check records to Supabase PostgreSQL table 'CHECKS'."""

    @staticmethod
    def is_configured() -> bool:
        """Check if Supabase URL and Key are set in environment configuration."""
        return bool(Config.SUPABASE_URL and Config.SUPABASE_KEY)

    @staticmethod
    def send_check(check) -> bool:
        """
        Send a single check instance to Supabase 'CHECKS' table via REST API (PostgREST).
        `check` can be a Check SQLAlchemy model instance or dict.
        """
        if not SupabaseService.is_configured():
            logger.debug("Supabase credentials not configured. Skipping Supabase sync.")
            return False

        url = f"{Config.SUPABASE_URL.rstrip('/')}/rest/v1/CHECKS"
        headers = {
            "apikey": Config.SUPABASE_KEY,
            "Authorization": f"Bearer {Config.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        # Handle both SQLAlchemy model instance and dictionary
        if hasattr(check, 'to_dict'):
            payload = check.to_dict()
            # Remove local auto-increment id so Supabase manages primary key if needed
            payload.pop('id', None)
        elif isinstance(check, dict):
            payload = check.copy()
            payload.pop('id', None)
        else:
            payload = {
                "url": check.url,
                "checked_at": check.checked_at.isoformat() if hasattr(check.checked_at, 'isoformat') else str(check.checked_at),
                "status_code": check.status_code,
                "response_ms": check.response_ms,
                "is_up": check.is_up,
                "ssl_days_left": check.ssl_days_left
            }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code in (200, 201):
                logger.info(f"Successfully synced check for {payload.get('url')} to Supabase.")
                return True
            else:
                logger.error(f"Failed to sync check to Supabase: HTTP {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"Exception occurred while syncing to Supabase: {str(e)}")
            return False

    @staticmethod
    def sync_batch(checks: list) -> int:
        """
        Send a batch of checks to Supabase.
        Returns count of successfully synced records.
        """
        if not SupabaseService.is_configured() or not checks:
            return 0

        url = f"{Config.SUPABASE_URL.rstrip('/')}/rest/v1/CHECKS"
        headers = {
            "apikey": Config.SUPABASE_KEY,
            "Authorization": f"Bearer {Config.SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        payloads = []
        for check in checks:
            if hasattr(check, 'to_dict'):
                p = check.to_dict()
                p.pop('id', None)
            elif isinstance(check, dict):
                p = check.copy()
                p.pop('id', None)
            else:
                p = {
                    "url": check.url,
                    "checked_at": check.checked_at.isoformat() if hasattr(check.checked_at, 'isoformat') else str(check.checked_at),
                    "status_code": check.status_code,
                    "response_ms": check.response_ms,
                    "is_up": check.is_up,
                    "ssl_days_left": check.ssl_days_left
                }
            payloads.append(p)

        try:
            response = requests.post(url, headers=headers, json=payloads, timeout=15)
            if response.status_code in (200, 201):
                logger.info(f"Successfully synced batch of {len(payloads)} checks to Supabase.")
                return len(payloads)
            else:
                logger.error(f"Failed to sync batch to Supabase: HTTP {response.status_code} - {response.text}")
                return 0
        except Exception as e:
            logger.error(f"Exception during Supabase batch sync: {str(e)}")
            return 0
