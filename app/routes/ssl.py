from flask import Blueprint, render_template, jsonify, request
from app.models import db
from app.models.monitor import Monitor
from app.models.ssl_check import SSLCheck
from datetime import datetime, timezone
from app.utils.time_utils import to_utc_iso

ssl_bp = Blueprint('ssl', __name__)

@ssl_bp.route('/ssl')
def index():
    return render_template('ssl.html')

@ssl_bp.route('/api/ssl')
def get_ssl_data():
    # 1. Get all active monitors
    monitors = Monitor.query.filter_by(is_active=True).all()
    
    # 2. Get latest SSL check for each
    results = []
    
    for m in monitors:
        latest = SSLCheck.query.filter_by(monitor_id=m.id).order_by(SSLCheck.checked_at.desc()).first()
        if latest:
            results.append({
                'monitor_id': m.id,
                'name': m.name,
                'url': m.url,
                'status': latest.status,
                'issuer': latest.issuer,
                'subject': latest.subject,
                'valid_from': to_utc_iso(latest.valid_from),
                'valid_to': to_utc_iso(latest.valid_to),
                'days_left': latest.days_left,
                'protocol': latest.protocol,
                'cipher': latest.cipher,
                'san_match': latest.san_match,
                'chain_json': latest.chain_json,
                'hsts': latest.hsts,
                'error_message': latest.error_message,
                'checked_at': to_utc_iso(latest.checked_at)
            })
        else:
            results.append({
                'monitor_id': m.id,
                'name': m.name,
                'url': m.url,
                'status': 'pending',
                'days_left': None
            })
            
    return jsonify(results)
