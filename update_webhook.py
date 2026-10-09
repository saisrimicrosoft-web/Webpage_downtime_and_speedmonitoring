from run import app
from app.models import db
from app.services.settings_service import SettingsService

with app.app_context():
    # Let's check what the current settings are
    s = SettingsService.get_all()
    print("webhook_enabled:", s.get('webhook_enabled'))
    print("webhook_url:", s.get('webhook_url'))

    new_url = 'https://discord.com/api/webhooks/1558042124589735936/N_bhkjxl_AvmRLQZEHGj9e0Y1y2HBXlrejjNqwEZ88XcKlTEhDiAkNmywtoS7-M469Xi'
    
    # Let's update it in the database just in case
    SettingsService.set_setting('webhook_url', new_url)
    
    s = SettingsService.get_all()
    print("UPDATED webhook_url:", s.get('webhook_url'))
