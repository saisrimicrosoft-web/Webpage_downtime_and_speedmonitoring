from flask import Blueprint, jsonify, request
from app.repositories.monitoring_repository import CheckRepository
from app.utils.url_validator import is_valid_url
from config import load_urls, save_urls
import json
import os

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


@api_bp.route('/logs', methods=['GET'])
def get_logs():
    """Get the most recent checks across all URLs."""
    limit = request.args.get('limit', 50, type=int)
    checks = CheckRepository.get_all_checks(limit=limit)
    return jsonify([c.to_dict() for c in checks])


@api_bp.route('/dashboard/summary', methods=['GET'])
def get_summary():
    """Get dashboard summary stats."""
    summary = CheckRepository.get_summary()
    return jsonify(summary)


SETTINGS_FILE = 'settings.json'

def load_settings_file():
    if not os.path.exists(SETTINGS_FILE):
        return {
            'profile': {'name': 'DevOps Admin', 'email': 'admin@example.com', 'phone': ''},
            'appearance': {'theme': 'System', 'fontSize': 'medium', 'language': 'English'},
            'notifications': {'email': True, 'push': False, 'marketing': False},
            'privacy': {'publicProfile': False, 'showOnline': True},
            'security': {'twoFactor': False}
        }
    with open(SETTINGS_FILE, 'r') as f:
        return json.load(f)

def save_settings_file(data):
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(data, f, indent=4)

@api_bp.route('/settings', methods=['GET'])
def get_settings():
    return jsonify(load_settings_file())

@api_bp.route('/settings', methods=['POST'])
def update_settings():
    data = request.json
    save_settings_file(data)
    return jsonify({'message': 'Settings saved successfully'})


# ─── Account & Security Actions ──────────────────────────────────────────────

@api_bp.route('/settings/password', methods=['POST'])
def change_password():
    data = request.json
    if not data or not data.get('password'):
        return jsonify({'error': 'Password is required'}), 400
    # In a real app, hash and save the password to the DB
    return jsonify({'message': 'Password updated successfully'})

# ─── Authentication Actions ──────────────────────────────────────────────────

@api_bp.route('/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Mocking authentication validation
    if data.get('email') or data.get('phone'):
        if data.get('password'):
            # In a real app, compare with DB
            return jsonify({'message': 'Login successful', 'token': 'mock_jwt_token_123'})
        return jsonify({'error': 'Password is required'}), 400
    
    return jsonify({'error': 'Email or Phone is required'}), 400

@api_bp.route('/auth/signup', methods=['POST'])
def auth_signup():
    data = request.json
    if not data:
        return jsonify({'error': 'Invalid request'}), 400
    
    # Mocking registration validation
    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
        
    if data.get('email') or data.get('phone'):
        if data.get('password'):
            # In a real app, save to DB
            return jsonify({'message': 'Signup successful', 'token': 'mock_jwt_token_456'})
        return jsonify({'error': 'Password is required'}), 400
    
    return jsonify({'error': 'Email or Phone is required'}), 400

@api_bp.route('/settings/logout', methods=['POST'])
def logout():
    # In a real app, clear the session cookie/token
    return jsonify({'message': 'Logged out successfully'})

@api_bp.route('/settings/logout-all', methods=['POST'])
def logout_all():
    # In a real app, invalidate all sessions for the user
    return jsonify({'message': 'Logged out of all devices'})

@api_bp.route('/settings/account', methods=['DELETE'])
def delete_account():
    # In a real app, delete the user from the DB
    if os.path.exists(SETTINGS_FILE):
        os.remove(SETTINGS_FILE)
    return jsonify({'message': 'Account deleted'})

@api_bp.route('/settings/export', methods=['GET'])
def export_data():
    data = load_settings_file()
    # Add some mock check data for the export
    data['monitors'] = load_urls()
    return jsonify(data)

