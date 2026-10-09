"""
Data retention — delete detailed UserCheck rows older than CHECK_RETENTION_DAYS.
Called once per day by the scheduler.
"""
import logging
from datetime import datetime, timezone, timedelta

from app.models import db
from app.models.user_check import UserCheck
from config import Config

logger = logging.getLogger(__name__)


def run_retention():
    """Delete UserCheck rows older than CHECK_RETENTION_DAYS days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=Config.CHECK_RETENTION_DAYS)
    deleted = (
        db.session.query(UserCheck)
        .filter(UserCheck.timestamp < cutoff)
        .delete(synchronize_session=False)
    )
    db.session.commit()
    if deleted:
        logger.info(f'Retention: deleted {deleted} UserCheck rows older than {cutoff.date()}')
