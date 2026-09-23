from app.models import db
from app.models.check import Check
from sqlalchemy import func


class CheckRepository:
    """Data access layer for the CHECKS table."""

    @staticmethod
    def get_latest_check_per_url():
        """Get the most recent check for each unique URL."""
        # Subquery to get the max checked_at per URL
        subq = db.session.query(
            Check.url,
            func.max(Check.checked_at).label('max_checked')
        ).group_by(Check.url).subquery()

        results = db.session.query(Check).join(
            subq,
            (Check.url == subq.c.url) & (Check.checked_at == subq.c.max_checked)
        ).all()
        return results

    @staticmethod
    def get_checks_for_url(url: str, limit: int = 50):
        """Get recent checks for a specific URL, ordered newest-first."""
        return Check.query.filter_by(url=url).order_by(
            Check.checked_at.desc()
        ).limit(limit).all()

    @staticmethod
    def get_all_checks(limit: int = 100):
        """Get the most recent checks across all URLs."""
        return Check.query.order_by(
            Check.checked_at.desc()
        ).limit(limit).all()

    @staticmethod
    def get_summary():
        """Get dashboard summary counts."""
        from config import load_urls
        urls = load_urls()
        latest = CheckRepository.get_latest_check_per_url()

        # Build a map of url -> latest check
        latest_map = {c.url: c for c in latest}

        total = len(urls)
        up_count = 0
        down_count = 0
        ssl_warning_count = 0
        unchecked = 0

        for url in urls:
            check = latest_map.get(url)
            if check is None:
                unchecked += 1
            elif check.is_up:
                up_count += 1
            else:
                down_count += 1

            # SSL warning
            if check and check.ssl_days_left is not None and check.ssl_days_left < 30:
                ssl_warning_count += 1

        return {
            'total': total,
            'up': up_count,
            'down': down_count,
            'ssl_warning': ssl_warning_count,
            'unchecked': unchecked
        }
