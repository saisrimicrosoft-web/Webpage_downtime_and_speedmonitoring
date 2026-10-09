from flask import Blueprint, jsonify, request
from datetime import datetime, timezone, timedelta
from app.models import db
from app.models.alert import Alert, AlertRule, NotificationChannel
from sqlalchemy import or_, and_, desc
import csv
import io
import requests

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    try:
        status = request.args.get('status', 'all')
        severity = request.args.get('severity', 'all')
        type_ = request.args.get('type', 'all')
        website_id = request.args.get('website_id', 'all')
        q = request.args.get('q', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        query = Alert.query

        if status != 'all':
            query = query.filter(Alert.status == status)
        if severity != 'all':
            query = query.filter(Alert.severity == severity)
        if type_ != 'all':
            query = query.filter(Alert.type == type_)
        if website_id != 'all':
            query = query.filter(Alert.website_id == website_id)
        if q:
            query = query.filter(or_(Alert.title.ilike(f'%{q}%'), Alert.website_id.ilike(f'%{q}%')))
        
        from_date = request.args.get('from')
        to_date = request.args.get('to')
        if from_date:
            try:
                fd = datetime.fromisoformat(from_date)
                query = query.filter(Alert.started_at >= fd)
            except: pass
        if to_date:
            try:
                td = datetime.fromisoformat(to_date)
                query = query.filter(Alert.started_at <= td)
            except: pass

        # Pagination
        pagination = query.order_by(desc(Alert.started_at)).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'alerts': [a.to_dict() for a in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/summary', methods=['GET'])
def get_summary():
    try:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = now - timedelta(days=1)

        active = Alert.query.filter_by(status='active').count()
        acknowledged = Alert.query.filter_by(status='acknowledged').count()
        resolved_today = Alert.query.filter(Alert.status == 'resolved', Alert.resolved_at >= today_start).count()
        critical = Alert.query.filter_by(status='active', severity='critical').count()
        warning = Alert.query.filter_by(status='active', severity='warning').count()
        alerts_last_24h = Alert.query.filter(Alert.started_at >= yesterday).count()

        # Calculate MTTR and MTTA
        resolved_alerts = Alert.query.filter(Alert.status == 'resolved', Alert.resolved_at != None).all()
        mttr = sum(a.duration_seconds for a in resolved_alerts if a.duration_seconds) / len(resolved_alerts) if resolved_alerts else 0

        acked_alerts = Alert.query.filter(Alert.acknowledged_at != None).all()
        mtta = sum((a.acknowledged_at - a.started_at.replace(tzinfo=None)).total_seconds() for a in acked_alerts) / len(acked_alerts) if acked_alerts else 0

        return jsonify({
            'active': active,
            'acknowledged': acknowledged,
            'resolved_today': resolved_today,
            'critical': critical,
            'warning': warning,
            'alerts_last_24h': alerts_last_24h,
            'mttr_seconds': mttr,
            'mtta_seconds': mtta
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/count', methods=['GET'])
def get_count():
    try:
        count = Alert.query.filter_by(status='active').count()
        return jsonify({'active': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:id>', methods=['GET'])
def get_alert(id):
    try:
        alert = Alert.query.get_or_404(id)
        # Assuming NotificationLog is loaded via some relationship or separate query if needed
        # We'll just return the alert for now
        return jsonify(alert.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:id>/acknowledge', methods=['POST'])
def acknowledge_alert(id):
    try:
        alert = Alert.query.get_or_404(id)
        if alert.status == 'active':
            alert.status = 'acknowledged'
            alert.acknowledged_at = datetime.now(timezone.utc)
            # You could pull user from session here
            alert.acknowledged_by = "Current User" 
            db.session.commit()
        return jsonify(alert.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:id>/resolve', methods=['POST'])
def resolve_alert(id):
    try:
        alert = Alert.query.get_or_404(id)
        if alert.status in ['active', 'acknowledged']:
            alert.status = 'resolved'
            alert.resolved_at = datetime.now(timezone.utc)
            if alert.started_at:
                alert.duration_seconds = int((alert.resolved_at.replace(tzinfo=None) - alert.started_at).total_seconds())
            db.session.commit()
        return jsonify(alert.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/bulk', methods=['POST'])
def bulk_action():
    try:
        data = request.get_json()
        ids = data.get('ids', [])
        action = data.get('action')
        
        if not ids or action not in ['acknowledge', 'resolve', 'delete']:
            return jsonify({'error': 'Invalid request'}), 400

        alerts = Alert.query.filter(Alert.id.in_(ids)).all()
        now = datetime.now(timezone.utc)

        for alert in alerts:
            if action == 'acknowledge' and alert.status == 'active':
                alert.status = 'acknowledged'
                alert.acknowledged_at = now
            elif action == 'resolve' and alert.status in ['active', 'acknowledged']:
                alert.status = 'resolved'
                alert.resolved_at = now
                if alert.started_at:
                    alert.duration_seconds = int((now.replace(tzinfo=None) - alert.started_at).total_seconds())
            elif action == 'delete':
                db.session.delete(alert)
        
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:id>', methods=['DELETE'])
def delete_alert(id):
    try:
        alert = Alert.query.get_or_404(id)
        db.session.delete(alert)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/export', methods=['GET'])
def export_alerts():
    try:
        query = Alert.query
        status = request.args.get('status', 'all')
        if status != 'all': query = query.filter(Alert.status == status)
        alerts = query.order_by(desc(Alert.started_at)).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['ID', 'Website', 'Type', 'Severity', 'Status', 'Started At', 'Resolved At', 'Duration (s)', 'Error'])
        
        for a in alerts:
            writer.writerow([a.id, a.website_id, a.type, a.severity, a.status, a.started_at, a.resolved_at, a.duration_seconds, a.error_message])
        
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="alerts.csv"'
        }
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/rules', methods=['GET', 'PUT'])
def handle_rules():
    try:
        if request.method == 'GET':
            rules = AlertRule.query.all()
            return jsonify([r.to_dict() for r in rules]), 200
        else:
            data = request.get_json()
            # Simple global rule update for now
            rule = AlertRule.query.filter_by(website_id=None).first()
            if not rule:
                rule = AlertRule(website_id=None)
                db.session.add(rule)
            
            rule.consecutive_failures_threshold = data.get('consecutive_failures_threshold', 2)
            rule.slow_response_ms = data.get('slow_response_ms', 2000)
            rule.ssl_warning_days = data.get('ssl_warning_days', 14)
            rule.cooldown_minutes = data.get('cooldown_minutes', 15)
            db.session.commit()
            return jsonify(rule.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/channels', methods=['GET', 'POST'])
def get_create_channels():
    try:
        if request.method == 'GET':
            channels = NotificationChannel.query.all()
            return jsonify([c.to_dict() for c in channels]), 200
        else:
            data = request.get_json()
            channel = NotificationChannel(
                type=data['type'],
                target=data['target'],
                enabled=data.get('enabled', True)
            )
            db.session.add(channel)
            db.session.commit()
            return jsonify(channel.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/channels/<int:id>', methods=['PUT', 'DELETE'])
def update_delete_channel(id):
    try:
        channel = NotificationChannel.query.get_or_404(id)
        if request.method == 'DELETE':
            db.session.delete(channel)
            db.session.commit()
            return jsonify({'success': True}), 200
        else:
            data = request.get_json()
            channel.enabled = data.get('enabled', channel.enabled)
            channel.target = data.get('target', channel.target)
            db.session.commit()
            return jsonify(channel.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/channels/<int:id>/test', methods=['POST'])
def test_channel(id):
    try:
        channel = NotificationChannel.query.get_or_404(id)
        if channel.type == 'in_app':
            return jsonify({'success': True, 'message': 'Simulated in_app success'}), 200
        elif channel.type in ['webhook', 'slack']:
            res = requests.post(channel.target, json={"text": "Test alert"}, timeout=3)
            return jsonify({'success': res.ok, 'message': f'HTTP {res.status_code}'}), 200
        return jsonify({'success': False, 'message': 'Simulated success (SMTP not config)'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 200

@alerts_bp.route('/pulse', methods=['GET'])
def get_pulse():
    # 30-minute buckets for last 18 hours (36 buckets)
    hours = int(request.args.get('hours', 18))
    now = datetime.utcnow()
    start_time = now - timedelta(hours=hours)
    
    # query failed checks
    from app.models.check import Check
    # We group by 30-min intervals. Since SQLite lacks nice DATE_TRUNC, we can fetch and group in Python.
    checks = Check.query.filter(Check.checked_at >= start_time, Check.status_code != 200).all()
    
    buckets = [0] * 36
    bucket_sec = 30 * 60
    
    for c in checks:
        diff_sec = (c.checked_at - start_time).total_seconds()
        idx = int(diff_sec // bucket_sec)
        if 0 <= idx < 36:
            buckets[idx] += 1
            
    return jsonify({'buckets': buckets}), 200

@alerts_bp.route('/radar', methods=['GET'])
def get_radar():
    from app.models.website import Website
    from app.models.check import Check
    websites = Website.query.all()
    results = []
    
    for w in websites:
        # Determine status from latest check or active alerts
        active_alert = Alert.query.filter_by(website_id=w.url, status='active').first()
        status = 'up'
        if active_alert:
            status = 'down' if active_alert.severity == 'critical' else 'degraded'
        results.append({
            'id': w.url,
            'name': w.name or w.url,
            'status': status
        })
    return jsonify(results), 200

@alerts_bp.route('/simulate', methods=['POST'])
def simulate_alert():
    try:
        new_alert = Alert(
            website_id='https://api.pulseguard.io',
            alert_type='down',
            severity='critical',
            title='Simulated Downtime',
            message='This is a test downtime event generated by the simulator.',
            status='active'
        )
        db.session.add(new_alert)
        db.session.commit()
        return jsonify({'message': 'Simulated alert created', 'id': new_alert.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
