"""
JWT auth helpers — token creation, verification, and Flask request decorator.
"""
import logging
from datetime import datetime, timezone, timedelta
from functools import wraps

import bcrypt
import jwt
from flask import request, jsonify, g

from config import Config

logger = logging.getLogger(__name__)


# ── Password helpers ────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def check_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


# ── JWT helpers ─────────────────────────────────────────────────────────────

def create_token(user_id: int) -> str:
    """Create a signed JWT for *user_id* that expires in JWT_EXPIRY_HOURS."""
    payload = {
        'sub': str(user_id),          # PyJWT 2.x requires sub to be a string
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> dict | None:
    """Decode and verify a JWT. Returns the payload dict or None on failure."""
    try:
        return jwt.decode(
            token,
            Config.JWT_SECRET_KEY,
            algorithms=['HS256'],
            options={'verify_sub': False},   # sub is a string-encoded int
        )
    except jwt.ExpiredSignatureError:
        logger.debug('JWT expired')
        return None
    except jwt.InvalidTokenError as e:
        logger.debug(f'JWT invalid: {e}')
        return None


# ── Flask decorator ─────────────────────────────────────────────────────────

def require_auth(f):
    """Decorator: extract Bearer token, verify it, set g.current_user_id.

    Returns 401 JSON if the token is missing or invalid.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        token = None

        if auth_header.startswith('Bearer '):
            token = auth_header[7:]

        if not token:
            return jsonify({'error': 'Authentication required'}), 401

        payload = decode_token(token)
        if payload is None:
            return jsonify({'error': 'Invalid or expired token'}), 401

        g.current_user_id = int(payload['sub'])
        return f(*args, **kwargs)

    return decorated
