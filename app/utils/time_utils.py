from datetime import datetime, timezone

def to_utc_iso(dt):
    """
    Ensure the datetime is timezone-aware (assumed UTC if naive)
    and format it as ISO 8601 with a 'Z' suffix.
    """
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    iso = dt.isoformat()
    if iso.endswith('+00:00'):
        iso = iso[:-6] + 'Z'
    elif not iso.endswith('Z'):
        iso = iso + 'Z'
    return iso

def utc_now():
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)
