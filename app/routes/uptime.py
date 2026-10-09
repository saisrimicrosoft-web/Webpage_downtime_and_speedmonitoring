"""
Uptime Status API — Dedicated endpoints for the Uptime Status page.
"""

from flask import Blueprint, jsonify, request, render_template
from urllib.parse import unquote
from app.repositories.uptime_repository import UptimeRepository
from config import load_urls

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
    urls = load_urls()
    summary = UptimeRepository.get_global_uptime_summary(urls, hours)
    return jsonify(summary)

@uptime_bp.route('/api/uptime/websites', methods=['GET'])
def get_websites():
    hours = _parse_hours(request.args.get('range', '24h'))
    urls = load_urls()
    websites = UptimeRepository.get_all_websites_uptime(urls, hours)
    return jsonify(websites)

@uptime_bp.route('/api/uptime/websites/<path:url_id>/daily', methods=['GET'])
def get_website_daily(url_id):
    url = unquote(url_id)
    daily = UptimeRepository.get_website_daily_uptime(url, days=90)
    return jsonify(daily)

@uptime_bp.route('/api/uptime/websites/<path:url_id>/history', methods=['GET'])
def get_website_history(url_id):
    url = unquote(url_id)
    hours = _parse_hours(request.args.get('range', '24h'))
    history = UptimeRepository.get_website_history(url, hours)
    return jsonify(history)

@uptime_bp.route('/api/uptime/incidents', methods=['GET'])
def get_incidents():
    hours = _parse_hours(request.args.get('range', '24h'))
    limit = int(request.args.get('limit', 50))
    offset = int(request.args.get('offset', 0))
    urls = load_urls()
    incidents = UptimeRepository.get_global_incidents(urls, hours, limit, offset)
    return jsonify(incidents)
