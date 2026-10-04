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
    def get_uptime_per_url():
        """Calculate average uptime percentage for each URL."""
        # We can just count total checks and up checks per url
        results = db.session.query(
            Check.url,
            func.count(Check.id).label('total_checks'),
            func.sum(db.case((Check.is_up == True, 1), else_=0)).label('up_checks')
        ).group_by(Check.url).all()
        
        uptime_map = {}
        for row in results:
            if row.total_checks > 0:
                uptime_map[row.url] = round((row.up_checks / row.total_checks) * 100, 2)
            else:
                uptime_map[row.url] = 0.0
        return uptime_map

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
        """Get dashboard summary counts and averages."""
        from config import load_urls
        urls = load_urls()
        latest = CheckRepository.get_latest_check_per_url()

        # Build a map of url -> latest check
        latest_map = {c.url: c for c in latest}

        total = len(urls)
        up_count = 0
        down_count = 0
        degraded_count = 0
        ssl_warning_count = 0
        unchecked = 0
        
        total_response_ms = 0
        response_count = 0
        
        latency_dist = {
            'fast': 0,      # <100ms
            'normal': 0,    # 100-250ms
            'slow': 0,      # 250-500ms
            'critical': 0   # >500ms
        }

        # Calculate uptime per site
        # We need historical stats. Let's do a quick global query for avg uptime.
        # Actually it's more efficient to just get all checks or query DB for aggregates.
        # For simplicity, we'll calculate current state metrics here.
        # The global average uptime will be calculated using a DB query.

        for url in urls:
            check = latest_map.get(url)
            if check is None:
                unchecked += 1
            else:
                if check.is_up:
                    if check.response_ms is not None and check.response_ms > 500:
                        degraded_count += 1
                    else:
                        up_count += 1
                else:
                    down_count += 1
                    
                if check.response_ms is not None:
                    total_response_ms += check.response_ms
                    response_count += 1
                    
                    if check.response_ms < 100:
                        latency_dist['fast'] += 1
                    elif check.response_ms <= 250:
                        latency_dist['normal'] += 1
                    elif check.response_ms <= 500:
                        latency_dist['slow'] += 1
                    else:
                        latency_dist['critical'] += 1

            # SSL warning
            if check and check.ssl_days_left is not None and check.ssl_days_left < 30:
                ssl_warning_count += 1

        avg_response_ms = (total_response_ms / response_count) if response_count > 0 else 0
        
        # Calculate overall uptime percentage
        total_checks_count = db.session.query(func.count(Check.id)).scalar()
        up_checks_count = db.session.query(func.count(Check.id)).filter(Check.is_up == True).scalar()
        
        avg_uptime_pct = 0
        if total_checks_count and total_checks_count > 0:
            avg_uptime_pct = (up_checks_count / total_checks_count) * 100

        return {
            'total': total,
            'up': up_count,
            'degraded': degraded_count,
            'down': down_count,
            'ssl_warning': ssl_warning_count,
            'unchecked': unchecked,
            'avg_response_ms': round(avg_response_ms),
            'avg_uptime_pct': round(avg_uptime_pct, 2),
            'latency_dist': latency_dist
        }
