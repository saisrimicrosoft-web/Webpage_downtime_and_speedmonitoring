"""
Incident Service — Manages the incident lifecycle.

Detects transitions between healthy/degraded/down states and creates
or resolves incidents accordingly. Groups consecutive failures into
a single incident to prevent duplicate entries.
"""

import logging
from datetime import datetime, timezone

from app.models import db
from app.models.incident import Incident
from app.models.check import Check
from config import Config

logger = logging.getLogger(__name__)

# Thresholds (centralised here — uses Config if available)
DEGRADED_THRESHOLD_MS = getattr(Config, 'DEGRADED_THRESHOLD_MS', 500)
TIMEOUT_THRESHOLD_MS = getattr(Config, 'REQUEST_TIMEOUT_SECONDS', 10) * 1000


def determine_status(check: Check) -> str:
    """Determine the status from a Check record.

    Returns one of: 'operational', 'degraded', 'down', 'unknown'.
    """
    if check is None:
        return 'unknown'

    if not check.is_up:
        return 'down'

    if check.response_ms is not None and check.response_ms > DEGRADED_THRESHOLD_MS:
        return 'degraded'

    if check.is_up:
        return 'operational'

    return 'unknown'


def process_check_for_incidents(check: Check, region: str = 'Primary'):
    """Process a monitoring check and create/resolve incidents as needed.

    Called after every monitoring check. Implements:
        HEALTHY → failure → INCIDENT CREATED
        ONGOING INCIDENT → more failures → INCIDENT UPDATED
        ONGOING INCIDENT → recovery → INCIDENT RESOLVED
    """
    status = determine_status(check)

    if status in ('down', 'degraded'):
        _handle_failure(check, status, region)
    elif status == 'operational':
        _handle_recovery(check, region)


def _handle_failure(check: Check, severity: str, region: str):
    """Create a new incident or update an existing open one."""
    # Find an open incident for this URL
    open_incident = Incident.query.filter_by(
        url=check.url, status='open'
    ).order_by(Incident.started_at.desc()).first()

    now = datetime.now(timezone.utc)

    if open_incident:
        # Update existing incident
        open_incident.failure_count += 1
        open_incident.last_check_id = check.id
        open_incident.updated_at = now
        # Escalate severity if needed (degraded → down)
        if severity == 'down' and open_incident.severity == 'degraded':
            open_incident.severity = 'down'
        db.session.commit()
        logger.info(f"Updated incident #{open_incident.id} for {check.url} "
                     f"(failures={open_incident.failure_count})")
    else:
        # Create new incident
        error_msg = None
        if check.status_code and check.status_code >= 400:
            error_msg = f"HTTP {check.status_code}"
        elif check.status_code == -1 or check.status_code is None:
            if check.response_ms and check.response_ms >= TIMEOUT_THRESHOLD_MS:
                error_msg = "Request timed out"
            else:
                error_msg = "Connection failed"

        incident = Incident(
            url=check.url,
            status='open',
            severity=severity,
            started_at=check.checked_at or now,
            detected_at=now,
            region=region,
            http_status=check.status_code,
            response_ms=check.response_ms,
            error_message=error_msg,
            failure_count=1,
            last_check_id=check.id,
        )
        db.session.add(incident)
        db.session.commit()
        logger.info(f"Created incident #{incident.id} for {check.url} "
                     f"(severity={severity}, region={region})")


def _handle_recovery(check: Check, region: str):
    """Close any open incidents for this URL upon recovery."""
    open_incidents = Incident.query.filter_by(
        url=check.url, status='open'
    ).all()

    if not open_incidents:
        return

    now = datetime.now(timezone.utc)
    for incident in open_incidents:
        incident.status = 'resolved'
        incident.recovered_at = now
        if incident.started_at:
            incident.duration_seconds = int((now - incident.started_at).total_seconds())
        incident.updated_at = now
        db.session.commit()
        logger.info(f"Resolved incident #{incident.id} for {check.url} "
                     f"(duration={incident.duration_display})")
