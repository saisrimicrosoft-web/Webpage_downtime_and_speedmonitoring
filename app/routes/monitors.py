"""
Monitors API — /api/monitors (CRUD + per-monitor check history & incidents)
All endpoints require authentication. Every query is scoped by user_id.
"""
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func

from app.models import db
from app.models.monitor import Monitor
from app.models.user_check import UserCheck
from app.models.user_incident import UserIncident
from app.utils.auth import require_auth
from app.utils.url_validator import is_valid_url

monitors_bp = Blueprint('monitors', __name__)


# ── Helper: latest check for a monitor ──────────────────────────────────────

def _latest_check(monitor_id: int):
    return (
        UserCheck.query
        .filter_by(monitor_id=monitor_id)
        .order_by(UserCheck.timestamp.desc())
        .first()
    )


def _uptime_pct(monitor_id: int, hours: int = 24) -> float:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    total = UserCheck.query.filter(
        UserCheck.monitor_id == monitor_id,
        UserCheck.timestamp >= cutoff
    ).count()
    if not total:
        return 0.0
    up = UserCheck.query.filter(
        UserCheck.monitor_id == monitor_id,
        UserCheck.timestamp >= cutoff,
        UserCheck.status == 'up'
    ).count()
    return round(up / total * 100, 2)


# ── LIST monitors ────────────────────────────────────────────────────────────

@monitors_bp.route('', methods=['GET'])
@require_auth
def list_monitors():
    monitors = Monitor.query.filter_by(user_id=g.current_user_id).order_by(Monitor.created_at.asc()).all()
    result = []
    for m in monitors:
        lc = _latest_check(m.id)
        result.append({
            **m.to_dict(),
            'uptime_24h': _uptime_pct(m.id, 24),
            'latest_check': lc.to_dict() if lc else None,
        })
    return jsonify(result)


# ── CREATE monitor ───────────────────────────────────────────────────────────

@monitors_bp.route('', methods=['POST'])
@require_auth
def create_monitor():
    data = request.get_json() or {}
    url  = (data.get('url') or '').strip()
    name = (data.get('name') or '').strip()

    if not url:
        return jsonify({'error': 'URL is required'}), 422
    if not is_valid_url(url):
        return jsonify({'error': 'Invalid URL — must start with http:// or https://'}), 422
    if not name:
        name = url.replace('https://', '').replace('http://', '').split('/')[0]

    # Prevent duplicate URLs per user
    exists = Monitor.query.filter_by(user_id=g.current_user_id, url=url).first()
    if exists:
        return jsonify({'error': 'This URL is already being monitored'}), 409

    monitor = Monitor(
        user_id                = g.current_user_id,
        name                   = name,
        url                    = url,
        check_interval_seconds = int(data.get('check_interval_seconds', 60)),
        timeout_seconds        = int(data.get('timeout_seconds', 10)),
        expected_status_code   = int(data.get('expected_status_code', 200)),
        is_active              = True,
    )
    db.session.add(monitor)
    db.session.commit()
    return jsonify(monitor.to_dict()), 201


# ── GET single monitor ───────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>', methods=['GET'])
@require_auth
def get_monitor(monitor_id):
    m = Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    lc = _latest_check(m.id)
    return jsonify({
        **m.to_dict(),
        'uptime_24h':  _uptime_pct(m.id, 24),
        'uptime_7d':   _uptime_pct(m.id, 168),
        'uptime_30d':  _uptime_pct(m.id, 720),
        'latest_check': lc.to_dict() if lc else None,
    })


# ── UPDATE monitor ───────────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>', methods=['PATCH'])
@require_auth
def update_monitor(monitor_id):
    m    = Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    data = request.get_json() or {}

    if 'name' in data:
        m.name = data['name'].strip() or m.name
    if 'url' in data:
        url = data['url'].strip()
        if not is_valid_url(url):
            return jsonify({'error': 'Invalid URL'}), 422
        m.url = url
    if 'check_interval_seconds' in data:
        m.check_interval_seconds = int(data['check_interval_seconds'])
    if 'timeout_seconds' in data:
        m.timeout_seconds = int(data['timeout_seconds'])
    if 'expected_status_code' in data:
        m.expected_status_code = int(data['expected_status_code'])
    if 'is_active' in data:
        m.is_active = bool(data['is_active'])

    db.session.commit()
    return jsonify(m.to_dict())


# ── DELETE monitor ───────────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>', methods=['DELETE'])
@require_auth
def delete_monitor(monitor_id):
    m = Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    db.session.delete(m)
    db.session.commit()
    return jsonify({'message': 'Monitor deleted'})


# ── RUN check immediately ────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>/check', methods=['POST'])
@require_auth
def run_check(monitor_id):
    m = Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    from app.services.user_monitor_service import UserMonitorService
    check = UserMonitorService.check_monitor(m)
    return jsonify(check.to_dict()), 201


# ── CHECK HISTORY ────────────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>/checks', methods=['GET'])
@require_auth
def get_checks(monitor_id):
    Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    hours   = int(request.args.get('hours', 24))
    limit   = min(int(request.args.get('limit', 200)), 1000)
    cutoff  = datetime.now(timezone.utc) - timedelta(hours=hours)
    checks  = (
        UserCheck.query
        .filter(UserCheck.monitor_id == monitor_id, UserCheck.timestamp >= cutoff)
        .order_by(UserCheck.timestamp.desc())
        .limit(limit)
        .all()
    )
    return jsonify([c.to_dict() for c in checks])


# ── INCIDENTS ────────────────────────────────────────────────────────────────

@monitors_bp.route('/<int:monitor_id>/incidents', methods=['GET'])
@require_auth
def get_incidents(monitor_id):
    Monitor.query.filter_by(id=monitor_id, user_id=g.current_user_id).first_or_404()
    hours  = int(request.args.get('hours', 720))   # 30 days default
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    incs   = (
        UserIncident.query
        .filter(UserIncident.monitor_id == monitor_id, UserIncident.started_at >= cutoff)
        .order_by(UserIncident.started_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([i.to_dict() for i in incs])


# ── DASHBOARD SUMMARY (all monitors for this user) ───────────────────────────

@monitors_bp.route('/summary', methods=['GET'])
@require_auth
def summary():
    monitors = Monitor.query.filter_by(user_id=g.current_user_id).all()
    total    = len(monitors)
    online   = 0
    down     = 0
    slow     = 0
    ssl_warn = 0
    total_checks = 0
    up_checks    = 0

    for m in monitors:
        lc = _latest_check(m.id)
        if lc:
            if lc.status == 'up':
                if lc.response_time_ms and lc.response_time_ms > 1000:
                    slow += 1
                else:
                    online += 1
            else:
                down += 1
            if lc.ssl_days_left is not None and 0 < lc.ssl_days_left < 30:
                ssl_warn += 1

        # overall uptime across all checks
        mon_total = UserCheck.query.filter_by(monitor_id=m.id).count()
        mon_up    = UserCheck.query.filter_by(monitor_id=m.id, status='up').count()
        total_checks += mon_total
        up_checks    += mon_up

    avg_uptime = round(up_checks / total_checks * 100, 2) if total_checks else 0.0

    return jsonify({
        'total':        total,
        'online':       online,
        'down':         down,
        'slow':         slow,
        'ssl_warnings': ssl_warn,
        'avg_uptime':   avg_uptime,
        'total_checks': total_checks,
    })


# ── HISTORY grouped for sidebar (Today / Yesterday / 7d / Older) ─────────────

@monitors_bp.route('/history', methods=['GET'])
@require_auth
def history():
    """Return recent incidents grouped by time bucket for the sidebar history section."""
    monitors = Monitor.query.filter_by(user_id=g.current_user_id).all()
    monitor_ids = [m.id for m in monitors]
    monitor_map = {m.id: m for m in monitors}

    if not monitor_ids:
        return jsonify({'today': [], 'yesterday': [], 'week': [], 'older': []})

    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    incs   = (
        UserIncident.query
        .filter(
            UserIncident.monitor_id.in_(monitor_ids),
            UserIncident.started_at >= cutoff,
        )
        .order_by(UserIncident.started_at.desc())
        .limit(200)
        .all()
    )

    now       = datetime.now(timezone.utc)
    today_start     = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start      = today_start - timedelta(days=7)

    buckets = {'today': [], 'yesterday': [], 'week': [], 'older': []}
    for inc in incs:
        m   = monitor_map.get(inc.monitor_id)
        row = {
            **inc.to_dict(),
            'monitor_name': m.name if m else 'Unknown',
            'monitor_url':  m.url  if m else '',
        }
        if inc.started_at >= today_start:
            buckets['today'].append(row)
        elif inc.started_at >= yesterday_start:
            buckets['yesterday'].append(row)
        elif inc.started_at >= week_start:
            buckets['week'].append(row)
        else:
            buckets['older'].append(row)

    return jsonify(buckets)
