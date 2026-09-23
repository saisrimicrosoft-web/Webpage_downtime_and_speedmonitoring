from flask import Blueprint, jsonify, request
from app.repositories.monitoring_repository import CheckRepository
from app.utils.url_validator import is_valid_url
from config import load_urls, save_urls

api_bp = Blueprint('api', __name__)


@api_bp.route('/urls', methods=['GET'])
def get_urls():
    """List all monitored URLs with their latest check data."""
    urls = load_urls()
    latest = CheckRepository.get_latest_check_per_url()
    latest_map = {c.url: c.to_dict() for c in latest}

    result = []
    for url in urls:
        check = latest_map.get(url)
        result.append({
            'url': url,
            'latest_check': check
        })
    return jsonify(result)


@api_bp.route('/urls', methods=['POST'])
def add_url():
    """Add a new URL to monitor."""
    data = request.json
    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400

    url = data['url'].strip()
    if not is_valid_url(url):
        return jsonify({'error': 'Invalid URL'}), 400

    urls = load_urls()
    if url in urls:
        return jsonify({'error': 'URL already monitored'}), 409

    urls.append(url)
    save_urls(urls)
    return jsonify({'message': f'Added {url}'}), 201


@api_bp.route('/urls', methods=['DELETE'])
def remove_url():
    """Remove a URL from monitoring."""
    data = request.json
    if not data or not data.get('url'):
        return jsonify({'error': 'URL is required'}), 400

    url = data['url'].strip()
    urls = load_urls()
    if url not in urls:
        return jsonify({'error': 'URL not found'}), 404

    urls.remove(url)
    save_urls(urls)
    return jsonify({'message': f'Removed {url}'})


@api_bp.route('/checks/<path:url>', methods=['GET'])
def get_checks(url):
    """Get recent checks for a specific URL."""
    checks = CheckRepository.get_checks_for_url(url, limit=50)
    return jsonify([c.to_dict() for c in checks])


@api_bp.route('/dashboard/summary', methods=['GET'])
def get_summary():
    """Get dashboard summary stats."""
    summary = CheckRepository.get_summary()
    return jsonify(summary)
