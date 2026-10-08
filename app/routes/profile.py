"""
Profile API — /api/profile
GET/PATCH profile, change password, alert settings, delete account.
"""
from flask import Blueprint, request, jsonify, g

from app.models import db
from app.models.user import User
from app.models.monitor import Monitor
from app.models.user_check import UserCheck
from app.models.alert_setting import AlertSetting
from app.utils.auth import require_auth, hash_password, check_password

profile_bp = Blueprint('profile', __name__)


@profile_bp.route('', methods=['GET'])
@require_auth
def get_profile():
    user = User.query.get_or_404(g.current_user_id)
    # Stats
    monitors     = Monitor.query.filter_by(user_id=user.id).count()
    total_checks = (
        UserCheck.query
        .join(Monitor, UserCheck.monitor_id == Monitor.id)
        .filter(Monitor.user_id == user.id)
        .count()
    )
    up_checks = (
        UserCheck.query
        .join(Monitor, UserCheck.monitor_id == Monitor.id)
        .filter(Monitor.user_id == user.id, UserCheck.status == 'up')
        .count()
    )
    uptime = round(up_checks / total_checks * 100, 2) if total_checks else 0.0

    return jsonify({
        **user.to_dict(),
        'stats': {
            'total_monitors': monitors,
            'total_checks':   total_checks,
            'overall_uptime': uptime,
        }
    })


@profile_bp.route('', methods=['PATCH'])
@require_auth
def update_profile():
    user = User.query.get_or_404(g.current_user_id)
    data = request.get_json() or {}

    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url'].strip() or None

    db.session.commit()
    return jsonify(user.to_dict())


@profile_bp.route('/password', methods=['POST'])
@require_auth
def change_password():
    user = User.query.get_or_404(g.current_user_id)
    data = request.get_json() or {}

    current  = data.get('current_password', '')
    new_pass = data.get('new_password', '')
    confirm  = data.get('confirm_password', '')

    if not check_password(current, user.password_hash):
        return jsonify({'error': 'Current password is incorrect'}), 400
    if len(new_pass) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 422
    if new_pass != confirm:
        return jsonify({'error': 'Passwords do not match'}), 422

    user.password_hash = hash_password(new_pass)
    db.session.commit()
    return jsonify({'message': 'Password updated'})


@profile_bp.route('/alert-settings', methods=['GET'])
@require_auth
def get_alert_settings():
    s = AlertSetting.query.filter_by(user_id=g.current_user_id).first()
    if not s:
        s = AlertSetting(user_id=g.current_user_id)
        db.session.add(s)
        db.session.commit()
    return jsonify(s.to_dict())


@profile_bp.route('/alert-settings', methods=['PATCH'])
@require_auth
def update_alert_settings():
    s = AlertSetting.query.filter_by(user_id=g.current_user_id).first()
    if not s:
        s = AlertSetting(user_id=g.current_user_id)
        db.session.add(s)

    data = request.get_json() or {}
    if 'email_alerts_enabled' in data:
        s.email_alerts_enabled = bool(data['email_alerts_enabled'])
    if 'alert_email' in data:
        s.alert_email = (data['alert_email'] or '').strip() or None
    if 'slow_threshold_ms' in data:
        s.slow_threshold_ms = int(data['slow_threshold_ms'])
    if 'notify_on_recovery' in data:
        s.notify_on_recovery = bool(data['notify_on_recovery'])
    if 'notify_on_ssl_expiry' in data:
        s.notify_on_ssl_expiry = bool(data['notify_on_ssl_expiry'])

    db.session.commit()
    return jsonify(s.to_dict())


@profile_bp.route('/delete', methods=['DELETE'])
@require_auth
def delete_account():
    data = request.get_json() or {}
    if not data.get('confirm'):
        return jsonify({'error': 'Confirmation required'}), 422

    user = User.query.get_or_404(g.current_user_id)
    db.session.delete(user)   # cascade deletes monitors, checks, incidents, settings
    db.session.commit()
    return jsonify({'message': 'Account deleted'})
