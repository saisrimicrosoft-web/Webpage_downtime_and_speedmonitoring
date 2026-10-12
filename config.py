import os
import json
from dotenv import load_dotenv

load_dotenv()

# Path to the urls.json file
URLS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'urls.json')

def load_urls():
    """Load the list of monitored URLs from the database (monitors table)."""
    try:
        from app.models.monitor import Monitor
        monitors = Monitor.query.filter_by(is_active=True).all()
        return [m.url for m in monitors]
    except Exception:
        # Fallback if outside app context or DB not initialized
        try:
            with open(URLS_FILE, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

def save_urls(urls):
    """Deprecated: URLs are now saved directly to the database via Monitor model."""
    pass

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI', 'sqlite:///monitor.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or os.environ.get('SECRET_KEY', 'jwt-secret')
    JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', 72))

    # Webhooks for alerts (Discord Webhook for downtime alerts)
    DISCORD_WEBHOOK_URL = os.environ.get('DISCORD_WEBHOOK_URL', '')

    # Monitoring settings
    CHECK_INTERVAL_SECONDS = int(os.environ.get('CHECK_INTERVAL_SECONDS', 60))
    REQUEST_TIMEOUT_SECONDS = int(os.environ.get('REQUEST_TIMEOUT_SECONDS', 10))

    # SSL warning threshold
    SSL_WARNING_DAYS = int(os.environ.get('SSL_WARNING_DAYS', 30))

    # Supabase Integration settings (optional)
    SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    # SMTP settings (optional — leave blank for log-only mode)
    SMTP_HOST     = os.environ.get('SMTP_HOST', '')
    SMTP_PORT     = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER     = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_FROM     = os.environ.get('SMTP_FROM', '')

    # Data retention: keep detailed checks for N days before aggregating
    CHECK_RETENTION_DAYS = int(os.environ.get('CHECK_RETENTION_DAYS', 30))

