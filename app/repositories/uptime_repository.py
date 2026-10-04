"""
Uptime Status Repository — Data access layer for the Uptime Status page.

Provides efficient queries for:
- Status history with pagination and filtering
- Uptime timeline data (time-bucketed status)
- Incident history
- Regional monitoring status
- Response-time statistics
"""

import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, case, and_, desc
from app.models import db
from app.models.check import Check
from app.models.incident import Incident

logger = logging.getLogger(__name__)


class UptimeRepository:
    """Data access methods for the Uptime Status feature."""

    # ── Current status for a URL ───────────────────────────────────

    @staticmethod
    def get_current_status(url: str) -> dict:
        """Get the latest check and derive current status for a URL."""
        latest = Check.query.filter_by(url=url).order_by(
            Check.checked_at.desc()
        ).first()

        if not latest:
            return {
                'status': 'unknown',
                'status_label': 'Unknown',
                'message': 'No monitoring data available yet.',
                'last_checked': None,
                'response_ms': None,
                'status_code': None,
                'ssl_days_left': None,
            }

        from app.services.incident_service import determine_status
        status = determine_status(latest)

        messages = {
            'operational': 'Your website is reachable and responding normally.',
            'degraded': 'Your website is responding but with higher-than-normal latency.',
            'down': 'Your website is unreachable or failing health checks.',
            'unknown': 'Monitoring status is currently unknown.',
        }

        return {
            'status': status,
            'status_label': status.capitalize(),
            'message': messages.get(status, messages['unknown']),
            'last_checked': latest.checked_at.isoformat() if latest.checked_at else None,
            'response_ms': latest.response_ms,
            'status_code': latest.status_code,
            'ssl_days_left': latest.ssl_days_left,
        }

    # ── Status history (paginated, filtered) ───────────────────────

    @staticmethod
    def get_status_history(url: str, hours: int = 24, status_filter: str = None,
                           page: int = 1, per_page: int = 50) -> dict:
        """Get paginated monitoring events for a URL.

        Args:
            url: Target URL
            hours: Time window (24, 168 for 7d, 720 for 30d)
            status_filter: 'operational', 'degraded', 'down', or None for all
            page: Page number (1-indexed)
            per_page: Items per page
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        query = Check.query.filter(
            Check.url == url,
            Check.checked_at >= cutoff
        )

        if status_filter == 'down':
            query = query.filter(Check.is_up == False)
        elif status_filter == 'degraded':
            query = query.filter(
                Check.is_up == True,
                Check.response_ms > 500
            )
        elif status_filter == 'operational':
            query = query.filter(
                Check.is_up == True,
                (Check.response_ms <= 500) | (Check.response_ms == None)
            )

        query = query.order_by(Check.checked_at.desc())

        total = query.count()
        checks = query.offset((page - 1) * per_page).limit(per_page).all()

        events = []
        for c in checks:
            from app.services.incident_service import determine_status
            st = determine_status(c)

            # Determine event type
            if not c.is_up:
                event_type = 'Incident'
            elif c.response_ms and c.response_ms > 500:
                event_type = 'Slow Response'
            else:
                event_type = 'Health Check'

            # Determine response display
            if c.response_ms is not None and c.response_ms >= 0:
                response_display = f"{c.response_ms} ms"
            elif c.status_code == -1 or c.status_code is None:
                response_display = 'Timeout'
            else:
                response_display = 'Error'

            events.append({
                'id': c.id,
                'checked_at': c.checked_at.isoformat() if c.checked_at else None,
                'status': st,
                'status_label': st.capitalize(),
                'response_ms': c.response_ms,
                'response_display': response_display,
                'status_code': c.status_code,
                'region': 'Primary',
                'event_type': event_type,
                'is_up': c.is_up,
            })

        return {
            'events': events,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': max(1, (total + per_page - 1) // per_page),
        }

    # ── Uptime timeline data ──────────────────────────────────────

    @staticmethod
    def get_uptime_timeline(url: str, hours: int = 24) -> list:
        """Get time-bucketed uptime status for the timeline visualization.

        Returns a list of time segments, each with:
            - start: segment start time
            - end: segment end time
            - status: 'operational', 'degraded', 'down', 'unknown'
            - checks: number of checks in segment
            - avg_response_ms: average response time
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        checks = Check.query.filter(
            Check.url == url,
            Check.checked_at >= cutoff
        ).order_by(Check.checked_at.asc()).all()

        if not checks:
            return []

        # Determine bucket size based on time range
        if hours <= 24:
            bucket_minutes = 30   # 48 segments for 24h
        elif hours <= 168:
            bucket_minutes = 180  # ~56 segments for 7d
        else:
            bucket_minutes = 720  # ~60 segments for 30d

        segments = []
        now = datetime.now(timezone.utc)
        segment_start = cutoff

        while segment_start < now:
            segment_end = min(segment_start + timedelta(minutes=bucket_minutes), now)

            # Find checks in this bucket
            bucket_checks = [
                c for c in checks
                if c.checked_at and segment_start <= c.checked_at < segment_end
            ]

            if not bucket_checks:
                segment_status = 'unknown'
                avg_resp = None
                check_count = 0
            else:
                down_count = sum(1 for c in bucket_checks if not c.is_up)
                degraded_count = sum(
                    1 for c in bucket_checks
                    if c.is_up and c.response_ms and c.response_ms > 500
                )
                check_count = len(bucket_checks)
                resp_values = [c.response_ms for c in bucket_checks if c.response_ms and c.response_ms >= 0]
                avg_resp = int(sum(resp_values) / len(resp_values)) if resp_values else None

                if down_count > 0:
                    segment_status = 'down'
                elif degraded_count > 0:
                    segment_status = 'degraded'
                else:
                    segment_status = 'operational'

            segments.append({
                'start': segment_start.isoformat(),
                'end': segment_end.isoformat(),
                'status': segment_status,
                'checks': check_count,
                'avg_response_ms': avg_resp,
            })

            segment_start = segment_end

        return segments

    # ── Incidents / Downtime history ──────────────────────────────

    @staticmethod
    def get_incidents(url: str, hours: int = 24, status_filter: str = None) -> list:
        """Get incidents (downtime/degraded events) for a URL."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        query = Incident.query.filter(
            Incident.url == url,
            Incident.started_at >= cutoff
        )

        if status_filter and status_filter != 'all':
            query = query.filter(Incident.severity == status_filter)

        incidents = query.order_by(Incident.started_at.desc()).limit(50).all()
        return [i.to_dict() for i in incidents]

    # ── Get a single incident ─────────────────────────────────────

    @staticmethod
    def get_incident_detail(incident_id: int) -> dict:
        """Get detailed information for a single incident."""
        incident = Incident.query.get(incident_id)
        if not incident:
            return None
        return incident.to_dict()

    # ── Regional status ───────────────────────────────────────────

    @staticmethod
    def get_regional_status(url: str) -> list:
        """Get monitoring status per region.

        Currently the backend supports a single region ('Primary').
        Returns a list so additional regions can be added.
        """
        latest = Check.query.filter_by(url=url).order_by(
            Check.checked_at.desc()
        ).first()

        if not latest:
            return [{'region': 'Primary', 'status': 'unknown', 'response_ms': None, 'last_checked': None}]

        from app.services.incident_service import determine_status
        status = determine_status(latest)

        return [{
            'region': 'Primary',
            'status': status,
            'status_label': status.capitalize(),
            'response_ms': latest.response_ms,
            'last_checked': latest.checked_at.isoformat() if latest.checked_at else None,
        }]

    # ── Response-time statistics ──────────────────────────────────

    @staticmethod
    def get_response_time_data(url: str, hours: int = 24) -> dict:
        """Get response time statistics and recent data points."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        checks = Check.query.filter(
            Check.url == url,
            Check.checked_at >= cutoff,
            Check.response_ms != None,
            Check.response_ms >= 0,
        ).order_by(Check.checked_at.asc()).all()

        if not checks:
            return {
                'current': None,
                'avg': None,
                'min': None,
                'max': None,
                'p95': None,
                'data_points': [],
            }

        resp_times = [c.response_ms for c in checks]
        resp_times_sorted = sorted(resp_times)

        # P95 calculation
        p95_idx = int(len(resp_times_sorted) * 0.95)
        p95_val = resp_times_sorted[min(p95_idx, len(resp_times_sorted) - 1)]

        # Recent data points for mini chart (last 30 points)
        recent = checks[-30:]
        data_points = [
            {
                'time': c.checked_at.isoformat() if c.checked_at else None,
                'value': c.response_ms,
            }
            for c in recent
        ]

        return {
            'current': checks[-1].response_ms if checks else None,
            'avg': int(sum(resp_times) / len(resp_times)),
            'min': min(resp_times),
            'max': max(resp_times),
            'p95': p95_val,
            'data_points': data_points,
        }

    # ── Uptime summary ────────────────────────────────────────────

    @staticmethod
    def get_uptime_summary(url: str, hours: int = 24) -> dict:
        """Get uptime percentage and summary stats for a time period."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        total = Check.query.filter(
            Check.url == url,
            Check.checked_at >= cutoff
        ).count()

        up_count = Check.query.filter(
            Check.url == url,
            Check.checked_at >= cutoff,
            Check.is_up == True
        ).count()

        incident_count = Incident.query.filter(
            Incident.url == url,
            Incident.started_at >= cutoff
        ).count()

        uptime_pct = round((up_count / total) * 100, 2) if total > 0 else 0

        return {
            'total_checks': total,
            'up_checks': up_count,
            'down_checks': total - up_count,
            'uptime_percentage': uptime_pct,
            'incident_count': incident_count,
            'time_range_hours': hours,
        }
