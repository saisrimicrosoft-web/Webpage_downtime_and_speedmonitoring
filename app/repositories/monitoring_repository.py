from typing import List, Dict, Any
from app.models.check import Check
from app.models import db
from sqlalchemy import func
from app.utils.uptime_calculator import get_uptime_stats_for_range

class CheckRepository:
    """Data access layer for reading monitoring data from SQLite for the dashboard."""

    @staticmethod
    def get_latest_check_per_url() -> List[Check]:
        # Fetch all checks, sort by checked_at descending, then get first per URL
        checks = Check.query.order_by(Check.url, Check.checked_at.desc()).all()
        seen_urls = set()
        latest_checks = []
        for c in checks:
            if c.url not in seen_urls:
                latest_checks.append(c)
                seen_urls.add(c.url)
        return latest_checks

    @staticmethod
    def get_checks_for_url(url: str, limit: int = 50) -> List[Check]:
        return Check.query.filter_by(url=url).order_by(Check.checked_at.desc()).limit(limit).all()

    @staticmethod
    def get_all_checks(limit: int = 100) -> List[Check]:
        return Check.query.order_by(Check.checked_at.desc()).limit(limit).all()

    @staticmethod
    def get_uptime_per_url() -> Dict[str, float]:
        from config import load_urls
        urls = load_urls()
        result = {}
        for url in urls:
            uptime_pct, _, _, _, _ = get_uptime_stats_for_range(url=url, hours=None)
            if uptime_pct == 0.0 and Check.query.filter_by(url=url).count() == 0:
                result[url] = 100.0 # No checks means default to 100.0 like before to match expectations
            else:
                result[url] = uptime_pct
        return result

    @staticmethod
    def get_summary() -> Dict[str, Any]:
        from config import load_urls
        urls = load_urls()
        latest = CheckRepository.get_latest_check_per_url()

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
            'fast': 0, 'normal': 0, 'slow': 0, 'critical': 0
        }

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

            if check and check.ssl_days_left is not None and check.ssl_days_left < 30:
                ssl_warning_count += 1

        avg_response_ms = (total_response_ms / response_count) if response_count > 0 else 0
        
        avg_uptime_pct, _, _, _, _ = get_uptime_stats_for_range(hours=None)

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
