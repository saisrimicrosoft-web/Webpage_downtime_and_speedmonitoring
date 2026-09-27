import requests
import time
from datetime import datetime, timezone
import logging

from app.models.check import Check
from app.models import db
from app.services.ssl_service import SSLService
from app.services.discord_service import DiscordService
from app.services.supabase_service import SupabaseService
from config import Config

logger = logging.getLogger(__name__)


class MonitorService:
    """Core monitoring engine.
    Data flow: URL → check → metrics → database → alert / visualization
    """

    @staticmethod
    def check_url(url: str) -> Check:
        """
        Perform a single monitoring check for a URL.
        1. Make an HTTP GET request and measure response time.
        2. Check the SSL certificate expiry.
        3. Store the result in the CHECKS table.
        4. Send a Discord alert if the site is down or SSL is expiring.
        Returns the created Check object.
        """
        logger.info(f"Checking URL: {url}")

        start_time = time.time()
        is_up = False
        status_code = None
        error_reason = ""

        # ---- HTTP check ----
        try:
            headers = {'User-Agent': 'UniversalMonitor/1.0'}
            response = requests.get(
                url,
                timeout=Config.REQUEST_TIMEOUT_SECONDS,
                headers=headers
            )
            status_code = response.status_code
            is_up = 200 <= status_code < 400
            if not is_up:
                error_reason = f"HTTP {status_code}"
        except requests.exceptions.Timeout:
            error_reason = "Request timed out"
        except requests.exceptions.ConnectionError:
            error_reason = "Connection failed (DNS / network)"
        except requests.exceptions.RequestException as e:
            error_reason = str(e)

        response_ms = int((time.time() - start_time) * 1000)

        # ---- SSL check ----
        ssl_days_left = None
        ssl_valid, ssl_days = SSLService.check_ssl(url)
        if ssl_days is not None:
            ssl_days_left = ssl_days

        # ---- Store in CHECKS table ----
        check = Check(
            url=url,
            checked_at=datetime.now(timezone.utc),
            status_code=status_code,
            response_ms=response_ms,
            is_up=is_up,
            ssl_days_left=ssl_days_left
        )
        db.session.add(check)
        db.session.commit()

        # ---- Supabase Sync ----
        try:
            SupabaseService.send_check(check)
        except Exception as e:
            logger.error(f"Error triggering Supabase sync: {e}")

        # ---- Discord alerts ----
        # Alert if site is down
        if not is_up:
            DiscordService.send_alert(
                url=url,
                is_up=False,
                status_code=status_code,
                response_ms=response_ms,
                reason=error_reason
            )

        # Alert if SSL is expiring soon
        if ssl_days_left is not None and ssl_days_left < Config.SSL_WARNING_DAYS and is_up:
            DiscordService.send_alert(
                url=url,
                is_up=True,
                ssl_days_left=ssl_days_left
            )

        logger.info(f"Check complete: {url} | up={is_up} | {response_ms}ms | SSL={ssl_days_left}")
        return check

    @staticmethod
    def check_all_urls():
        """Check all configured URLs. Called by the scheduler."""
        from config import load_urls
        urls = load_urls()
        results = []
        for url in urls:
            try:
                check = MonitorService.check_url(url)
                results.append(check)
            except Exception as e:
                logger.error(f"Error checking {url}: {str(e)}")
        return results
