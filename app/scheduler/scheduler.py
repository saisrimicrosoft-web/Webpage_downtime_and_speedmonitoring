from apscheduler.schedulers.background import BackgroundScheduler
import logging
import atexit

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

# Store app reference for context
_app = None


def run_all_checks():
    """Scheduled job: check all URLs from urls.json within an app context."""
    from app.services.monitor import MonitorService
    if _app is None:
        logger.error("No Flask app reference available for scheduler.")
        return
    with _app.app_context():
        try:
            MonitorService.check_all_urls()
        except Exception as e:
            logger.error(f"Scheduler exception during monitoring: {str(e)}")


def start_scheduler(app):
    """Start the background scheduler with a single repeating job."""
    global _app
    _app = app

    from config import Config

    if not scheduler.running:
        scheduler.add_job(
            func=run_all_checks,
            trigger="interval",
            seconds=Config.CHECK_INTERVAL_SECONDS,
            id="monitor_all",
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )
        scheduler.start()
        logger.info(f"Scheduler started (interval={Config.CHECK_INTERVAL_SECONDS}s).")

        atexit.register(lambda: scheduler.shutdown(wait=False))
