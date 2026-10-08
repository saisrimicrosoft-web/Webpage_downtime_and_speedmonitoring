from apscheduler.schedulers.background import BackgroundScheduler
import logging
import atexit

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()
_app = None


def run_all_checks():
    """Scheduled job: run legacy checks + user-scoped monitor checks."""
    from app.services.monitor import MonitorService
    from app.services.user_monitor_service import UserMonitorService

    if _app is None:
        logger.error('No Flask app reference available for scheduler.')
        return

    with _app.app_context():
        # 1. Legacy URL-level checks (keeps existing dashboard working)
        try:
            MonitorService.check_all_urls()
        except Exception as e:
            logger.error(f'Legacy scheduler error: {e}')

        # 2. User-scoped monitor checks (new auth system)
        try:
            UserMonitorService.check_all_monitors()
        except Exception as e:
            logger.error(f'UserMonitor scheduler error: {e}')


def run_retention():
    """Scheduled job: prune old check rows once per day."""
    if _app is None:
        return
    with _app.app_context():
        try:
            from app.utils.retention import run_retention as _run
            _run()
        except Exception as e:
            logger.error(f'Retention job error: {e}')


def start_scheduler(app):
    global _app
    _app = app

    from config import Config

    if not scheduler.running:
        scheduler.add_job(
            func=run_all_checks,
            trigger='interval',
            seconds=Config.CHECK_INTERVAL_SECONDS,
            id='monitor_all',
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.add_job(
            func=run_retention,
            trigger='interval',
            hours=24,
            id='retention',
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()
        logger.info(f'Scheduler started (interval={Config.CHECK_INTERVAL_SECONDS}s, retention=24h).')
        atexit.register(lambda: scheduler.shutdown(wait=False))
