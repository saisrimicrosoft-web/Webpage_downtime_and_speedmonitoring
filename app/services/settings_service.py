from app.models.setting import Setting
from app.models import db
from datetime import datetime, timezone

class SettingsService:
    _cache = {}
    _cache_time = None
    
    DEFAULT_SETTINGS = {
        'check_interval': '60',
        'request_timeout': '10',
        'retries': '2',
        'slow_response_ms': '2000',
        'email_enabled': 'false',
        'email_address': '',
        'webhook_enabled': 'false',
        'webhook_url': '',
        'browser_alerts': 'false',
        'sound_enabled': 'false',
        'notify_down': 'true',
        'notify_recover': 'true',
        'notify_ssl': 'true',
        'theme': 'dark',
        'timezone': 'UTC',
        'date_format': 'YYYY-MM-DD',
        'retention_days': '90'
    }

    @classmethod
    def get_setting(cls, key, default=None):
        if key in cls._cache:
            return cls._cache[key]
        
        s = Setting.query.filter_by(key=key, user_id=None).first()
        if s:
            cls._cache[key] = s.value
            return s.value
            
        fallback = cls.DEFAULT_SETTINGS.get(key, default)
        cls._cache[key] = fallback
        return fallback

    @classmethod
    def get_all(cls):
        settings = Setting.query.filter_by(user_id=None).all()
        result = cls.DEFAULT_SETTINGS.copy()
        for s in settings:
            result[s.key] = s.value
        cls._cache = result
        return result

    @classmethod
    def set_setting(cls, key, value):
        s = Setting.query.filter_by(key=key, user_id=None).first()
        if s:
            s.value = str(value)
        else:
            s = Setting(key=key, value=str(value), user_id=None)
            db.session.add(s)
        db.session.commit()
        cls._cache[key] = str(value)
        return s

    @classmethod
    def set_multiple(cls, settings_dict):
        for key, value in settings_dict.items():
            if key in cls.DEFAULT_SETTINGS:
                s = Setting.query.filter_by(key=key, user_id=None).first()
                if s:
                    s.value = str(value)
                else:
                    s = Setting(key=key, value=str(value), user_id=None)
                    db.session.add(s)
                cls._cache[key] = str(value)
        db.session.commit()

    @classmethod
    def seed_defaults(cls):
        for k, v in cls.DEFAULT_SETTINGS.items():
            s = Setting.query.filter_by(key=k, user_id=None).first()
            if not s:
                db.session.add(Setting(key=k, value=str(v), user_id=None))
        db.session.commit()
        cls._cache.clear()
