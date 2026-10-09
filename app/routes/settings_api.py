import os
import csv
import zipfile
import io
from flask import Blueprint, jsonify, request, current_app, Response
from app.models.setting import Setting
from app.models.user import User
from app.models.check import Check
from app.models.alert import Alert, AlertRule, NotificationChannel, NotificationLog
from app.models import db
from app.services.settings_service import SettingsService
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import uuid
import smtplib
from email.message import EmailMessage
import requests

settings_api_bp = Blueprint('settings_api', __name__)

@settings_api_bp.route('/settings', methods=['GET'])
def get_settings():
    try:
        s = SettingsService.get_all()
        from app.models.user import User
        user = User.query.first()
        profile_data = user.to_dict() if user else {}
        if user and user.avatar_path:
            profile_data['avatar'] = user.avatar_path
            
        return jsonify({
            'settings': s,
            'profile': profile_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings', methods=['PUT'])
def update_setting():
    try:
        data = request.json
        key = data.get('key')
        value = data.get('value')
        
        if not key:
            return jsonify({'error': 'Key is required'}), 400
            
        # Convert boolean to string for DB
        if isinstance(value, bool):
            value = 'true' if value else 'false'
        else:
            value = str(value)
            
        # Basic validation
        if key == 'check_interval' and value not in ['30', '60', '300', '600']:
            return jsonify({'error': 'Invalid check interval'}), 400
        if key == 'request_timeout' and value not in ['5', '10', '30']:
            return jsonify({'error': 'Invalid request timeout'}), 400
        if key == 'retries' and value not in ['1', '2', '3']:
            return jsonify({'error': 'Invalid retries'}), 400
        if key == 'slow_response_ms':
            if not value.isdigit() or not (200 <= int(value) <= 30000):
                return jsonify({'error': 'Invalid slow response threshold'}), 400
        if key == 'retention_days' and value not in ['Never', '30', '90', '365']:
            return jsonify({'error': 'Invalid retention days'}), 400
            
        SettingsService.set_setting(key, value)
        
        # Reschedule if interval changed
        if key == 'check_interval':
            from app.scheduler.scheduler import scheduler
            import logging
            logger = logging.getLogger(__name__)
            try:
                scheduler.reschedule_job("monitor_all", trigger="interval", seconds=int(value))
                logger.info(f"Rescheduled check interval to {value}s")
            except Exception as e:
                logger.error(f"Failed to reschedule monitor job: {str(e)}")
                
        return jsonify({'message': 'Setting saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/profile', methods=['GET'])
def get_profile():
    try:
        user = User.query.first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/profile', methods=['PUT'])
def update_profile():
    try:
        data = request.json
        user = User.query.first()
        errors = {}
        
        name = data.get('name', '').strip()
        if len(name) < 2 or len(name) > 60:
            errors['name'] = 'Name must be 2-60 characters'
            
        email = data.get('email', '').strip()
        if '@' not in email or '.' not in email:
            errors['email'] = 'Invalid email address'
            
        # Check uniqueness
        if email != user.email and User.query.filter_by(email=email).first():
            errors['email'] = 'Email is already in use'

        if errors:
            return jsonify({'errors': errors}), 400

        user.name = name
        user.email = email
        db.session.commit()
        return jsonify({'message': 'Profile updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/profile/password', methods=['PUT'])
def change_password():
    try:
        data = request.json
        user = User.query.first()
        errors = {}
        
        current_pw = data.get('current_password', '')
        new_pw = data.get('new_password', '')
        
        if not check_password_hash(user.password_hash, current_pw):
            errors['current_password'] = 'Incorrect password'
            
        if len(new_pw) < 8:
            errors['new_password'] = 'Must be at least 8 characters'
            
        if errors:
            return jsonify({'errors': errors}), 400
            
        user.password_hash = generate_password_hash(new_pw)
        db.session.commit()
        return jsonify({'message': 'Password changed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/profile/avatar', methods=['POST'])
def upload_avatar():
    try:
        if 'avatar' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.webp'}
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            return jsonify({'error': 'Only PNG, JPG, WEBP allowed'}), 400
            
        # size check is handled by max content length, but let's double check
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > 2 * 1024 * 1024:
            return jsonify({'error': 'File must be under 2MB'}), 400

        user = User.query.first()
        
        # Delete old
        if user.avatar_path:
            old_path = os.path.join(current_app.root_path, user.avatar_path.lstrip('/'))
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass

        filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'avatars')
        os.makedirs(upload_dir, exist_ok=True)
        
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        
        url_path = f"/static/uploads/avatars/{filename}"
        user.avatar_path = url_path
        db.session.commit()
        
        return jsonify({'message': 'Avatar uploaded', 'avatar_url': url_path})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/profile/avatar', methods=['DELETE'])
def remove_avatar():
    try:
        user = User.query.first()
        if user.avatar_path:
            old_path = os.path.join(current_app.root_path, user.avatar_path.lstrip('/'))
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except:
                    pass
            user.avatar_path = None
            db.session.commit()
        return jsonify({'message': 'Avatar removed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/notifications/test', methods=['POST'])
def test_notification():
    try:
        s = SettingsService.get_all()
        results = []
        channel = request.args.get('channel')
        
        if channel == 'email' and s.get('email_enabled') == 'true':
            # Simulated (no SMTP config provided in task)
            results.append(f"Email to {s.get('email_address')}: Simulated (No SMTP credentials)")
            
        elif channel == 'webhook' and s.get('webhook_enabled') == 'true':
            url = s.get('webhook_url')
            try:
                resp = requests.post(url, json={"text": "Nexora Test Alert"}, timeout=5)
                results.append(f"Webhook: Sent ({resp.status_code})")
            except Exception as e:
                results.append(f"Webhook: Failed ({str(e)})")
                
        if not results:
            return jsonify({'message': 'Channel not enabled or missing config'})
            
        return jsonify({'message': ' | '.join(results)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/data/export', methods=['GET'])
def export_all():
    try:
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Alerts
            alerts = Alert.query.all()
            if alerts:
                a_file = io.StringIO()
                cw = csv.writer(a_file)
                cw.writerow(alerts[0].to_dict().keys())
                for a in alerts:
                    cw.writerow(a.to_dict().values())
                zf.writestr('alerts.csv', a_file.getvalue())
                
            # Checks
            checks = Check.query.limit(10000).all() # Limit to avoid massive memory usage
            if checks:
                c_file = io.StringIO()
                cw = csv.writer(c_file)
                cw.writerow(['id', 'url', 'checked_at', 'status_code', 'response_ms', 'is_up'])
                for c in checks:
                    cw.writerow([c.id, c.url, c.checked_at, c.status_code, c.response_ms, c.is_up])
                zf.writestr('checks.csv', c_file.getvalue())
                
        memory_file.seek(0)
        return Response(
            memory_file.getvalue(),
            mimetype="application/zip",
            headers={"Content-Disposition": "attachment;filename=nexora_data_export.zip"}
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_api_bp.route('/settings/data/purge', methods=['POST'])
def purge_data():
    try:
        data = request.json
        if data.get('confirm') != 'DELETE':
            return jsonify({'error': 'Confirmation invalid'}), 400
            
        # Delete alerts and logs
        NotificationLog.query.delete()
        Alert.query.delete()
        Check.query.delete()
        db.session.commit()
        
        return jsonify({'message': 'Monitoring data deleted successfully.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
