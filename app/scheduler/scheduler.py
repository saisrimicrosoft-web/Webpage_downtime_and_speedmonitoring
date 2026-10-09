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


def cleanup_old_data():
    if _app is None:
        return
    with _app.app_context():
        try:
            from app.services.settings_service import SettingsService
            from app.models.check import Check
            from app.models.alert import Alert, NotificationLog
            from app.models import db
            from datetime import datetime, timedelta, timezone

            days = SettingsService.get_setting('retention_days')
            if days == 'Never':
                return
            
            cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
            
            # Delete old logs
            logs_deleted = NotificationLog.query.filter(NotificationLog.sent_at < cutoff).delete()
            alerts_deleted = Alert.query.filter(Alert.started_at < cutoff).delete()
            checks_deleted = Check.query.filter(Check.checked_at < cutoff).delete()
            db.session.commit()
            
            total = logs_deleted + alerts_deleted + checks_deleted
            logger.info(f"Cleanup job finished. Deleted {total} old records.")
        except Exception as e:
            logger.error(f"Error in cleanup job: {str(e)}")

def start_scheduler(app):
    """Start the background scheduler with a single repeating job."""
    global _app
    _app = app

    if not scheduler.running:
        from app.services.settings_service import SettingsService
        # Get interval from settings, default to 60 if not seeded yet
        try:
            interval = int(SettingsService.get_setting('check_interval', '60'))
        except:
            interval = 60

        scheduler.add_job(
            func=run_all_checks,
            trigger="interval",
            seconds=interval,
            id="monitor_all",
            replace_existing=True,
            max_instances=1,
            coalesce=True
        )
        
        # Add daily cleanup job
        scheduler.add_job(
            func=cleanup_old_data,
            trigger="interval",
            hours=24,
            id="cleanup_job",
            replace_existing=True
        )

        scheduler.start()
        logger.info(f"Scheduler started (interval={interval}s).")

        atexit.register(lambda: scheduler.shutdown(wait=False))
