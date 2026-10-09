import requests
import time
from datetime import datetime, timezone
import logging

from app.services.ssl_service import SSLService
from config import Config

# Supabase Pipeline Integration
from monitoring_core.db_client import MonitoringDatabaseClient
from monitoring_core.alert_manager import AlertManager

logger = logging.getLogger(__name__)

# Module-level singletons — initialized lazily on first use
_db_client = None
_alert_manager = None
_init_attempted = False


def get_pipeline():
    """Lazily initialize the Supabase DB client and Discord AlertManager.

    The DB client and alert manager are initialized independently so that
    a missing DISCORD_WEBHOOK_URL does not prevent database operations.
    """
    global _db_client, _alert_manager, _init_attempted

    if _init_attempted:
        return _db_client, _alert_manager

    _init_attempted = True

    # 1. Initialize Supabase DB client
    try:
        _db_client = MonitoringDatabaseClient()
    except ValueError as e:
        logger.error(f"Failed to initialize Supabase DB client: {e}")
        return None, None

    # 2. Initialize AlertManager (independent — won't crash if webhook is missing)
    try:
        _alert_manager = AlertManager(_db_client)
    except Exception as e:
        logger.error(f"Failed to initialize AlertManager: {e}")
        # DB client still works even if alerting fails
        _alert_manager = None

    return _db_client, _alert_manager


class MonitorService:
    """Core monitoring engine using Supabase and Stateful Alerting.

    Data flow: URL → check → metrics → Supabase → stateful alert / dashboard
    """

    @staticmethod
    def check_url(url: str):
        """Perform a single monitoring check for a URL.

        1. Make an HTTP GET request and measure response time.
        2. Check the SSL certificate expiry.
        3. Store the result in the Supabase check_results table.
        4. Evaluate state transitions and fire Discord alerts via AlertManager.
        """
        logger.info(f"Checking URL: {url}")

        db, alerter = get_pipeline()
        if not db:
            logger.error(
                "No Supabase DB client available. "
                "Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
            )
            return None

        # Fetch or create target in Supabase to get the target_id
        target = db.get_or_create_target_by_url(url)
        if not target:
            logger.error(f"Could not resolve target for {url}")
            return None

        target_id = target.get("id")

        # ── HTTP check ──
        start_time = time.time()
        is_up = False
        status_code = None

        try:
            headers = {"User-Agent": "UniversalMonitor/1.0"}
            response = requests.get(
                url,
                timeout=Config.REQUEST_TIMEOUT_SECONDS,
                headers=headers,
            )
            status_code = response.status_code
            is_up = 200 <= status_code < 400
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout checking {url}")
        except requests.exceptions.ConnectionError:
            logger.warning(f"Connection error checking {url}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request error checking {url}: {e}")

        response_ms = int((time.time() - start_time) * 1000)

        # ── SSL check ──
        ssl_days_left = None
        ssl_valid = False
        ssl_is_valid, ssl_days = SSLService.check_ssl(url)
        if ssl_days is not None:
            ssl_days_left = ssl_days
            ssl_valid = ssl_is_valid if ssl_is_valid is not None else False

        # ── Store in Supabase check_results table ──
        check_result = {
            "target_id": target_id,
            "status_code": status_code,
            "response_time_ms": response_ms,
            "is_up": is_up,
            "ssl_valid": ssl_valid,
            "ssl_days_remaining": ssl_days_left,
        }

        logged_result = db.log_check_result(check_result)

        # ── Stateful Discord alerts via AlertManager ──
        if alerter:
            payload_for_alert = {**check_result, **logged_result, "target_id": target_id}
            try:
                alerter.process_check(payload_for_alert)
            except Exception as e:
                logger.error(f"AlertManager error for {url}: {e}")

        # ── Store in local database (SQLite) ──
        from app.models import db
        from app.models.check import Check
        from app.services.incident_service import process_check_for_incidents
        
        now_utc = datetime.now(timezone.utc)
        check = Check(
            url=url,
            checked_at=now_utc,
            status_code=status_code,
            response_ms=response_ms,
            is_up=is_up,
            ssl_days_left=ssl_days_left
        )
        db.session.add(check)
        db.session.commit()
        
        # Process for incidents
        process_check_for_incidents(check)

        return logged_result

    @staticmethod
    def check_all_urls():
        """Check all configured URLs from urls.json. Called by the scheduler."""
        from config import load_urls

        urls = load_urls()
        results = []
        for url in urls:
            try:
                result = MonitorService.check_url(url)
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(f"Error checking {url}: {str(e)}")
        return results
