"""
Uptime Status API — Dedicated endpoints for the Uptime Status page.

All endpoints serve JSON for the frontend to consume via fetch().
"""

from flask import Blueprint, jsonify, request, render_template
from app.repositories.uptime_repository import UptimeRepository
from config import load_urls

uptime_bp = Blueprint('uptime', __name__)


# ── Page route ────────────────────────────────────────────────────

@uptime_bp.route('/uptime-status')
def uptime_page():
    """Render the Uptime Status page."""
    urls = load_urls()
    return render_template('uptime_status.html', monitored_urls=urls)


# ── API: Monitored websites list ─────────────────────────────────

@uptime_bp.route('/api/uptime/websites', methods=['GET'])
def get_websites():
    """Get all monitored websites with their current status."""
    urls = load_urls()
    websites = []
    for url in urls:
        status_data = UptimeRepository.get_current_status(url)
        websites.append({
            'url': url,
            **status_data,
        })
    return jsonify(websites)


# ── API: Current status ──────────────────────────────────────────

@uptime_bp.route('/api/uptime/status', methods=['GET'])
def get_status():
    """Get current status for a specific website."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    urls = load_urls()
    if url not in urls:
        return jsonify({'error': 'URL is not being monitored'}), 404

    status_data = UptimeRepository.get_current_status(url)
    return jsonify({
        'url': url,
        **status_data,
    })


# ── API: Status history ──────────────────────────────────────────

@uptime_bp.route('/api/uptime/history', methods=['GET'])
def get_history():
    """Get paginated status history for a website."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    hours = _parse_hours(request.args.get('range', '24h'))
    status_filter = request.args.get('status', None)
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    # Clamp per_page to prevent abuse
    per_page = min(per_page, 100)

    data = UptimeRepository.get_status_history(
        url=url,
        hours=hours,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
    )
    return jsonify(data)


# ── API: Uptime timeline ─────────────────────────────────────────

@uptime_bp.route('/api/uptime/timeline', methods=['GET'])
def get_timeline():
    """Get uptime timeline segments for visualization."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    hours = _parse_hours(request.args.get('range', '24h'))
    segments = UptimeRepository.get_uptime_timeline(url=url, hours=hours)
    return jsonify(segments)


# ── API: Incidents ────────────────────────────────────────────────

@uptime_bp.route('/api/uptime/incidents', methods=['GET'])
def get_incidents():
    """Get incidents/downtime events for a website."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    hours = _parse_hours(request.args.get('range', '24h'))
    status_filter = request.args.get('severity', None)

    incidents = UptimeRepository.get_incidents(
        url=url, hours=hours, status_filter=status_filter
    )
    return jsonify(incidents)


# ── API: Incident detail ─────────────────────────────────────────

@uptime_bp.route('/api/uptime/incidents/<int:incident_id>', methods=['GET'])
def get_incident_detail(incident_id):
    """Get detailed information for a single incident."""
    detail = UptimeRepository.get_incident_detail(incident_id)
    if not detail:
        return jsonify({'error': 'Incident not found'}), 404
    return jsonify(detail)


# ── API: Regional status ─────────────────────────────────────────

@uptime_bp.route('/api/uptime/regions', methods=['GET'])
def get_regions():
    """Get monitoring status per region."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    regions = UptimeRepository.get_regional_status(url=url)
    return jsonify(regions)


# ── API: Response time ────────────────────────────────────────────

@uptime_bp.route('/api/uptime/response-time', methods=['GET'])
def get_response_time():
    """Get response time statistics."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    hours = _parse_hours(request.args.get('range', '24h'))
    data = UptimeRepository.get_response_time_data(url=url, hours=hours)
    return jsonify(data)


# ── API: Uptime summary ──────────────────────────────────────────

@uptime_bp.route('/api/uptime/summary', methods=['GET'])
def get_summary():
    """Get uptime percentage and summary stats."""
    url = request.args.get('url', '')
    if not url:
        return jsonify({'error': 'URL parameter is required'}), 400

    hours = _parse_hours(request.args.get('range', '24h'))
    summary = UptimeRepository.get_uptime_summary(url=url, hours=hours)
    return jsonify(summary)


# ── Helper ────────────────────────────────────────────────────────

def _parse_hours(range_str: str) -> int:
    """Parse a range string like '24h', '7d', '30d' to hours."""
    range_str = range_str.lower().strip()
    if range_str in ('7d', '168h'):
        return 168
    elif range_str in ('30d', '720h'):
        return 720
    elif range_str in ('90d', '2160h'):
        return 2160
    else:
        return 24
