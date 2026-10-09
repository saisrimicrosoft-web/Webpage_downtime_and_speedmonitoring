import logging
from datetime import datetime, timezone, timedelta
from app.models import db
from app.models.check import Check
from app.models.incident import Incident
from app.utils.uptime_calculator import get_uptime_stats_for_range

logger = logging.getLogger(__name__)

class UptimeRepository:

    @staticmethod
    def get_global_uptime_summary(urls: list, hours: int) -> dict:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        total_up = 0
        total_checks = 0
        total_downtime_seconds = 0
        total_response_ms = 0
        total_response_count = 0
        incident_count = 0
        longest_outage = 0
        live_down_count = 0
        live_degraded_count = 0

        for url in urls:
            pct, up, tot, avg_resp, down = get_uptime_stats_for_range(url, hours)
            total_up += up
            total_checks += tot
            
            checks = Check.query.filter(Check.url == url, Check.checked_at >= cutoff).all()
            for c in checks:
                if c.response_ms and c.response_ms >= 0:
                    total_response_ms += c.response_ms
                    total_response_count += 1
            
            # Incidents for this url in range
            incs = Incident.query.filter(Incident.url == url, Incident.started_at >= cutoff).all()
            incident_count += len(incs)
            for inc in incs:
                end_time = inc.recovered_at or datetime.now(timezone.utc)
                duration = (end_time - inc.started_at.replace(tzinfo=timezone.utc)).total_seconds()
                total_downtime_seconds += duration
                if duration > longest_outage:
                    longest_outage = duration

            # Live status
            latest = Check.query.filter_by(url=url).order_by(Check.checked_at.desc()).first()
            if latest:
                if not latest.is_up:
                    live_down_count += 1
                elif latest.response_ms and latest.response_ms > 500:
                    live_degraded_count += 1

        overall_uptime = (total_up / total_checks * 100) if total_checks > 0 else 0.0
        avg_response_time = (total_response_ms / total_response_count) if total_response_count > 0 else 0

        if live_down_count > 0:
            overall_state = 'down' if live_down_count > len(urls)/2 else 'partial'
        elif live_degraded_count > 0:
            overall_state = 'degraded'
        else:
            overall_state = 'operational'

        return {
            'overall_uptime_pct': overall_uptime,
            'total_downtime_seconds': total_downtime_seconds,
            'incident_count': incident_count,
            'avg_response_time': int(avg_response_time),
            'longest_outage_seconds': longest_outage,
            'overall_state': overall_state
        }

    @staticmethod
    def get_all_websites_uptime(urls: list, hours: int) -> list:
        websites = []
        for url in urls:
            pct, up, tot, avg_resp, down = get_uptime_stats_for_range(url, hours)
            pct24, _, _, _, _ = get_uptime_stats_for_range(url, 24)
            pct7d, _, _, _, _ = get_uptime_stats_for_range(url, 168)
            pct30d, _, _, _, _ = get_uptime_stats_for_range(url, 720)
            pct90d, _, _, _, _ = get_uptime_stats_for_range(url, 2160)
            
            latest = Check.query.filter_by(url=url).order_by(Check.checked_at.desc()).first()
            
            if not latest:
                status = 'unknown'
            else:
                from app.services.incident_service import determine_status
                status = determine_status(latest)
            
            websites.append({
                'url': url,
                'name': url.replace('https://', '').replace('http://', ''),
                'status': status,
                'uptime_pct': pct,
                'uptime_24h': pct24,
                'uptime_7d': pct7d,
                'uptime_30d': pct30d,
                'uptime_90d': pct90d,
                'avg_response_time': avg_resp,
                'last_checked': latest.checked_at.isoformat() if latest and latest.checked_at else None,
                'daily': UptimeRepository.get_website_daily_uptime(url, 90)
            })
        return websites

    @staticmethod
    def get_website_daily_uptime(url: str, days: int) -> list:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        checks = Check.query.filter(Check.url == url, Check.checked_at >= cutoff).order_by(Check.checked_at.asc()).all()
        
        daily_data = {}
        now = datetime.now(timezone.utc)
        for i in range(days):
            day_start = now - timedelta(days=days - i)
            day_str = day_start.strftime('%Y-%m-%d')
            daily_data[day_str] = {'up': 0, 'down': 0, 'total': 0, 'date': day_str}
            
        for c in checks:
            if not c.checked_at: continue
            day_str = c.checked_at.strftime('%Y-%m-%d')
            if day_str in daily_data:
                daily_data[day_str]['total'] += 1
                if c.is_up: daily_data[day_str]['up'] += 1
                else: daily_data[day_str]['down'] += 1
                
        result = []
        for k, v in daily_data.items():
            tot = v['total']
            up = v['up']
            pct = (up / tot * 100) if tot > 0 else None
            # Downtime calculation: assume 1 check = 1 minute roughly if checks are 60s
            downtime_minutes = v['down']
            result.append({
                'date': v['date'],
                'uptime_pct': pct,
                'downtime_minutes': downtime_minutes,
                'checks': tot
            })
            
        return result

    @staticmethod
    def get_website_history(url: str, hours: int) -> list:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        checks = Check.query.filter(Check.url == url, Check.checked_at >= cutoff).order_by(Check.checked_at.asc()).all()
        history = []
        for c in checks:
            history.append({
                'time': c.checked_at.isoformat() if c.checked_at else None,
                'response_ms': c.response_ms,
                'is_up': c.is_up
            })
        return history

    @staticmethod
    def get_global_incidents(urls: list, hours: int, limit: int, offset: int) -> list:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = Incident.query.filter(Incident.url.in_(urls), Incident.started_at >= cutoff)
        query = query.order_by(Incident.started_at.desc())
        
        total = query.count()
        incidents = query.offset(offset).limit(limit).all()
        
        result = []
        for inc in incidents:
            duration = None
            if inc.recovered_at:
                duration = (inc.recovered_at - inc.started_at).total_seconds()
            elif inc.started_at:
                duration = (datetime.now(timezone.utc).replace(tzinfo=None) - inc.started_at).total_seconds()
                
            result.append({
                'id': inc.id,
                'url': inc.url,
                'name': inc.url.replace('https://', '').replace('http://', ''),
                'status': 'Resolved' if inc.status == 'CLOSED' else 'Ongoing',
                'severity': inc.severity,
                'started_at': inc.started_at.isoformat() if inc.started_at else None,
                'resolved_at': inc.recovered_at.isoformat() if inc.recovered_at else None,
                'duration_seconds': duration,
                'cause': inc.error_message
            })
            
        return {
            'incidents': result,
            'total': total,
            'limit': limit,
            'offset': offset
        }
