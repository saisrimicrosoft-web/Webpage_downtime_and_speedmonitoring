from typing import List, Dict, Any

class CheckRepository:
    """Data access layer for reading from Supabase for the dashboard."""

    _db_client = None

    @classmethod
    def get_db(cls):
        if cls._db_client is None:
            from monitoring_core.db_client import MonitoringDatabaseClient
            try:
                cls._db_client = MonitoringDatabaseClient()
            except Exception as e:
                import logging
                logging.error(f"Supabase DB init failed: {e}")
        return cls._db_client

    @staticmethod
    def _map_check(check_row: Dict[str, Any], url: str) -> Any:
        class DummyCheck:
            def __init__(self, c_row, c_url):
                self.url = c_url
                self.is_up = c_row.get('is_up', False)
                self.response_ms = c_row.get('response_time_ms')
                self.ssl_days_left = c_row.get('ssl_days_remaining')
                self.data = {
                    'id': c_row.get('id'),
                    'url': c_url,
                    'checked_at': c_row.get('checked_at'),
                    'status_code': c_row.get('status_code'),
                    'response_ms': c_row.get('response_time_ms'),
                    'is_up': c_row.get('is_up', False),
                    'ssl_days_left': c_row.get('ssl_days_remaining')
                }
            def to_dict(self):
                return self.data
        return DummyCheck(check_row, url)

    @staticmethod
    def get_latest_check_per_url():
        db = CheckRepository.get_db()
        if not db:
            return []
        
        targets = db.get_all_targets()
        results = []
        for target in targets:
            recent = db.get_recent_checks(target['id'], limit=1)
            if recent:
                results.append(CheckRepository._map_check(recent[0], target['url']))
        return results

    @staticmethod
    def get_checks_for_url(url: str, limit: int = 50):
        db = CheckRepository.get_db()
        if not db:
            return []
            
        target = db.get_or_create_target_by_url(url)
        if not target:
            return []
            
        recent = db.get_recent_checks(target['id'], limit=limit)
        return [CheckRepository._map_check(c, url) for c in recent]

    @staticmethod
    def get_all_checks(limit: int = 100):
        db = CheckRepository.get_db()
        if not db:
            return []
            
        # Supabase Python client doesn't support joins elegantly yet without RPC or views.
        # We will fetch recent checks and map them to targets.
        response = db.supabase.table("check_results").select("*").order("checked_at", desc=True).limit(limit).execute()
        checks = response.data if response.data else []
        
        targets = {t['id']: t['url'] for t in db.get_all_targets()}
        
        return [CheckRepository._map_check(c, targets.get(c['target_id'], 'Unknown')) for c in checks]

    @staticmethod
    def get_summary():
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
        
        db = CheckRepository.get_db()
        avg_uptime_pct = 0
        if db:
            # Calculate uptime using simple count over all checks
            total_checks_resp = db.supabase.table("check_results").select("id", count="exact").execute()
            up_checks_resp = db.supabase.table("check_results").select("id", count="exact").eq("is_up", True).execute()
            
            total_checks_count = total_checks_resp.count if total_checks_resp else 0
            up_checks_count = up_checks_resp.count if up_checks_resp else 0
            
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
