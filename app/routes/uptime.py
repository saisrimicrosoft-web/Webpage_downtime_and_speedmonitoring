"""
Uptime Status API — Dedicated endpoints for the Uptime Status page.
"""
from flask import Blueprint, jsonify, request, render_template
from urllib.parse import unquote
from datetime import datetime, timezone, timedelta
from sqlalchemy import func
from app.models.monitor import Monitor
from app.models.user_check import UserCheck
from app.models.user_incident import UserIncident
from app.models import db

uptime_bp = Blueprint('uptime', __name__)

@uptime_bp.route('/uptime-status')
def uptime_page():
    return render_template('uptime_status.html')

def _parse_hours(range_str: str) -> int:
    range_str = range_str.lower().strip()
    if range_str == '7d': return 168
    elif range_str == '30d': return 720
    elif range_str == '90d': return 2160
    return 24

@uptime_bp.route('/api/uptime/summary', methods=['GET'])
def get_summary():
    hours = _parse_hours(request.args.get('range', '24h'))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    monitors = Monitor.query.filter_by(is_active=True).all()
    if not monitors:
        return jsonify({
            'overall_uptime_pct': None,
            'total_downtime_seconds': 0,
            'incident_count': 0,
            'avg_response_time': None,
            'longest_outage_seconds': 0,
            'overall_state': 'operational'
        })
        
    monitor_ids = [m.id for m in monitors]
    
    total_checks = UserCheck.query.filter(UserCheck.monitor_id.in_(monitor_ids), UserCheck.timestamp >= cutoff).count()
    up_checks = UserCheck.query.filter(UserCheck.monitor_id.in_(monitor_ids), UserCheck.timestamp >= cutoff, UserCheck.status == 'up').count()
    
    overall_uptime = (up_checks / total_checks * 100) if total_checks > 0 else None
    
    avg_resp = db.session.query(func.avg(UserCheck.response_time_ms)).filter(
        UserCheck.monitor_id.in_(monitor_ids),
        UserCheck.timestamp >= cutoff,
        UserCheck.response_time_ms.isnot(None)
    ).scalar()
    
    incidents = UserIncident.query.filter(UserIncident.monitor_id.in_(monitor_ids), UserIncident.started_at >= cutoff).all()
    incident_count = len(incidents)
    
    total_downtime_seconds = 0
    longest_outage = 0
    for inc in incidents:
        end_time = inc.resolved_at.replace(tzinfo=timezone.utc) if inc.resolved_at else datetime.now(timezone.utc)
        duration = (end_time - inc.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        total_downtime_seconds += duration
        if duration > longest_outage:
            longest_outage = duration
            
    # live status
    live_down_count = 0
    live_degraded_count = 0
    for m in monitors:
        latest = UserCheck.query.filter_by(monitor_id=m.id).order_by(UserCheck.timestamp.desc()).first()
        if latest:
            if latest.status != 'up':
                live_down_count += 1
            elif latest.response_time_ms and latest.response_time_ms > 500:
                live_degraded_count += 1
                
    if live_down_count > 0:
        overall_state = 'down' if live_down_count > len(monitors)/2 else 'partial'
    elif live_degraded_count > 0:
        overall_state = 'degraded'
    else:
        overall_state = 'operational'
        
    return jsonify({
        'overall_uptime_pct': overall_uptime,
        'total_downtime_seconds': total_downtime_seconds,
        'incident_count': incident_count,
        'avg_response_time': int(avg_resp) if avg_resp else None,
        'longest_outage_seconds': longest_outage,
        'overall_state': overall_state
    })

@uptime_bp.route('/api/uptime/websites', methods=['GET'])
def get_websites():
    hours = _parse_hours(request.args.get('range', '24h'))
    monitors = Monitor.query.filter_by(is_active=True).all()
    
    def get_stats(m_id, hrs):
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hrs)
        tot = UserCheck.query.filter(UserCheck.monitor_id == m_id, UserCheck.timestamp >= cutoff).count()
        up = UserCheck.query.filter(UserCheck.monitor_id == m_id, UserCheck.timestamp >= cutoff, UserCheck.status == 'up').count()
        pct = (up / tot * 100) if tot > 0 else None
        return pct
        
    res = []
    for m in monitors:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        avg_resp = db.session.query(func.avg(UserCheck.response_time_ms)).filter(
            UserCheck.monitor_id == m.id, UserCheck.timestamp >= cutoff, UserCheck.response_time_ms.isnot(None)
        ).scalar()
        
        latest = UserCheck.query.filter_by(monitor_id=m.id).order_by(UserCheck.timestamp.desc()).first()
        if not latest:
            status = 'unknown'
        elif latest.status != 'up':
            status = 'down'
        elif latest.response_time_ms and latest.response_time_ms > 500:
            status = 'degraded'
        else:
            status = 'operational'
            
        # Daily breakdown (last 90 days)
        daily = []
        for i in range(89, -1, -1):
            d_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            d_end = d_start + timedelta(days=1)
            tot_d = UserCheck.query.filter(UserCheck.monitor_id == m.id, UserCheck.timestamp >= d_start, UserCheck.timestamp < d_end).count()
            up_d = UserCheck.query.filter(UserCheck.monitor_id == m.id, UserCheck.timestamp >= d_start, UserCheck.timestamp < d_end, UserCheck.status == 'up').count()
            daily.append({
                'date': d_start.strftime('%Y-%m-%d'),
                'uptime_pct': (up_d / tot_d * 100) if tot_d > 0 else None,
                'downtime_minutes': (tot_d - up_d) * (m.check_interval_seconds / 60) if tot_d > 0 else 0,
                'checks': tot_d
            })
            
        res.append({
            'url': m.url,
            'name': m.name,
            'status': status,
            'uptime_pct': get_stats(m.id, hours),
            'uptime_24h': get_stats(m.id, 24),
            'uptime_7d': get_stats(m.id, 168),
            'uptime_30d': get_stats(m.id, 720),
            'uptime_90d': get_stats(m.id, 2160),
            'avg_response_time': int(avg_resp) if avg_resp else None,
            'daily': daily
        })
        
    return jsonify(res)

@uptime_bp.route('/api/uptime/websites/<path:url_id>/daily', methods=['GET'])
def get_website_daily(url_id):
    url = unquote(url_id)
    m = Monitor.query.filter_by(is_active=True, url=url).first()
    if not m:
        return jsonify([])
    daily = []
    for i in range(89, -1, -1):
        d_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        d_end = d_start + timedelta(days=1)
        tot_d = UserCheck.query.filter(UserCheck.monitor_id == m.id, UserCheck.timestamp >= d_start, UserCheck.timestamp < d_end).count()
        up_d = UserCheck.query.filter(UserCheck.monitor_id == m.id, UserCheck.timestamp >= d_start, UserCheck.timestamp < d_end, UserCheck.status == 'up').count()
        daily.append({
            'date': d_start.strftime('%Y-%m-%d'),
            'uptime_pct': (up_d / tot_d * 100) if tot_d > 0 else None,
            'downtime_minutes': (tot_d - up_d) * (m.check_interval_seconds / 60) if tot_d > 0 else 0,
            'checks': tot_d
        })
    return jsonify(daily)

@uptime_bp.route('/api/uptime/websites/<path:url_id>/history', methods=['GET'])
def get_website_history(url_id):
    url = unquote(url_id)
    m = Monitor.query.filter_by(is_active=True, url=url).first()
    if not m:
        return jsonify([])
    hours = _parse_hours(request.args.get('range', '24h'))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    checks = UserCheck.query.filter(UserCheck.monitor_id == m.id, UserCheck.timestamp >= cutoff).order_by(UserCheck.timestamp.asc()).all()
    
    return jsonify([{
        'time': c.timestamp.isoformat(),
        'response_ms': c.response_time_ms,
        'status': c.status
    } for c in checks])

@uptime_bp.route('/api/uptime/incidents', methods=['GET'])
def get_incidents():
    hours = _parse_hours(request.args.get('range', '24h'))
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    monitors = Monitor.query.filter_by(is_active=True).all()
    if not monitors:
        return jsonify({'incidents': []})
        
    monitor_ids = [m.id for m in monitors]
    m_map = {m.id: m for m in monitors}
    
    incidents = UserIncident.query.filter(
        UserIncident.monitor_id.in_(monitor_ids),
        UserIncident.started_at >= cutoff
    ).order_by(UserIncident.started_at.desc()).limit(50).all()
    
    res = []
    for inc in incidents:
        end_time = inc.resolved_at.replace(tzinfo=timezone.utc) if inc.resolved_at else datetime.now(timezone.utc)
        duration = (end_time - inc.started_at.replace(tzinfo=timezone.utc)).total_seconds()
        res.append({
            'id': inc.id,
            'url': m_map[inc.monitor_id].url,
            'status': inc.status,
            'started_at': inc.started_at.isoformat(),
            'resolved_at': inc.resolved_at.isoformat() if inc.resolved_at else None,
            'duration_seconds': duration,
            'error_message': inc.reason
        })
        
    return jsonify({'incidents': res})
