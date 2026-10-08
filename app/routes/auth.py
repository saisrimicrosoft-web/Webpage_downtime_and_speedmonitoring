"""
Auth API — /api/auth/signup, /login, /logout, /me
"""
import re
from flask import Blueprint, request, jsonify, g

from app.models import db
from app.models.user import User
from app.models.alert_setting import AlertSetting
from app.utils.auth import hash_password, check_password, create_token, require_auth

auth_bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm  = data.get('confirm_password') or ''

    # Validation
    errors = {}
    if not name:
        errors['name'] = 'Name is required'
    if not EMAIL_RE.match(email):
        errors['email'] = 'Enter a valid email address'
    if len(password) < 8:
        errors['password'] = 'Password must be at least 8 characters'
    if password != confirm:
        errors['confirm_password'] = 'Passwords do not match'
    if errors:
        return jsonify({'errors': errors}), 422

    # Uniqueness check
    if User.query.filter_by(email=email).first():
        return jsonify({'errors': {'email': 'This email is already registered'}}), 409

    # Create user + default alert settings
    user = User(
        name          = name,
        email         = email,
        password_hash = hash_password(password),
    )
    db.session.add(user)
    db.session.flush()

    settings = AlertSetting(user_id=user.id)
    db.session.add(settings)
    db.session.commit()

    token = create_token(user.id)
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    email    = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'errors': {'general': 'Email and password are required'}}), 422

    user = User.query.filter_by(email=email).first()
    if not user or not check_password(password, user.password_hash):
        return jsonify({'errors': {'general': 'Invalid email or password'}}), 401

    token = create_token(user.id)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    user = User.query.get(g.current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    # JWT is stateless; client drops the token. Server-side nothing to do.
    return jsonify({'message': 'Logged out'})
