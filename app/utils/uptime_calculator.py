from datetime import datetime, timezone, timedelta
from app.models.check import Check
from app.models import db

def get_uptime_stats_for_range(url: str = None, hours: int = 24):
    """
    Shared calculation for uptime. If url is None, returns overall stats.
    Uptime % formula: (successful checks / total checks) * 100 in the range.
    Days with zero checks are "no data", NOT 0%, and must be excluded from the average.
    """
    query = Check.query
    if url:
        query = query.filter_by(url=url)
        
    if hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(Check.checked_at >= cutoff)
        
    total_checks = query.count()
    if total_checks == 0:
        return 0.0, 0, 0, 0, 0
        
    up_checks = query.filter_by(is_up=True).count()
    
    # Calculate downtime seconds based on checks
    # For a more exact value, we could look at incident duration.
    # We will just return the raw counts to be used.
    
    uptime_pct = round((up_checks / total_checks) * 100, 2)
    
    # Average response time (excluding failed checks where response_ms is None)
    resp_query = query.filter(Check.response_ms != None)
    avg_response_row = resp_query.with_entities(db.func.avg(Check.response_ms)).scalar()
    
    # Actually simpler:
    resp_times = [c.response_ms for c in resp_query.all() if c.response_ms is not None]
    avg_resp = int(sum(resp_times) / len(resp_times)) if resp_times else 0

    return uptime_pct, up_checks, total_checks, avg_resp, total_checks - up_checks

