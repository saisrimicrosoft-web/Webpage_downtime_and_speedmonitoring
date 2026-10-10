import os
import logging
from flask import Flask
from flask_cors import CORS
from config import Config
from backend.models import db
from backend.routes.dashboard import dashboard_bp
from backend.routes.websites import websites_bp
from backend.routes.api import api_bp
from backend.routes.uptime import uptime_bp
from backend.routes.auth import auth_bp
from backend.routes.monitors import monitors_bp
from backend.routes.profile import profile_bp
from backend.routes.alerts import alerts_bp
from backend.scheduler.scheduler import start_scheduler
from backend.utils.logging_config import setup_logging

logger = logging.getLogger(__name__)

def create_app(config_class=Config):
    setup_logging()

    app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
    app.config.from_object(config_class)

    # Allow Next.js dev server (port 3000) and same-origin in production
    CORS(app, resources={r'/api/*': {'origins': ['http://localhost:3000', 'http://127.0.0.1:3000']}},
         supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(websites_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(uptime_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(monitors_bp, url_prefix='/api/monitors')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    
    from backend.routes.alerts_page import alerts_page_bp
    app.register_blueprint(alerts_page_bp)
    
    from backend.routes.auth_page import auth_page_bp
    app.register_blueprint(auth_page_bp)

    from backend.routes.settings_api import settings_api_bp
    app.register_blueprint(settings_api_bp, url_prefix='/api')
    
    from backend.routes.settings_page import settings_page_bp
    app.register_blueprint(settings_page_bp)
    
    from backend.routes.ssl import ssl_bp
    app.register_blueprint(ssl_bp)
    # Setup database (create all tables) and seed default user
    with app.app_context():
        try:
            os.makedirs(app.instance_path, exist_ok=True)
        except OSError:
            pass # Vercel read-only filesystem
        db.create_all()
        _migrate_legacy_data()

        from backend.models.user import User
        from backend.utils.auth import hash_password
        if not User.query.first():
            admin = User(name='DevOps Admin', email='admin@example.com', password_hash=hash_password('admin123'))
            db.session.add(admin)
            db.session.commit()

        from backend.services.settings_service import SettingsService
        SettingsService.seed_defaults()
        # Start the background scheduler
        if (os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug) and not os.environ.get('VERCEL'):
            start_scheduler(app)

    return app


def _migrate_legacy_data():
    """
    One-time migration: if urls.json has URLs and no monitors exist yet,
    create a default user and migrate those URLs as monitors.
    Safe to run repeatedly — skips if migration already done.
    """
    from backend.models.user import User
    from backend.models.monitor import Monitor
    from backend.models.alert_setting import AlertSetting
    from backend.utils.auth import hash_password
    from config import load_urls

    urls = load_urls()
    if not urls:
        return

    # Check if migration already happened
    if Monitor.query.count() > 0:
        return

    logger.info('Migrating legacy urls.json to default user...')

    # Create default user if not exists
    default_email = 'admin@monitor.local'
    user = User.query.filter_by(email=default_email).first()
    if not user:
        user = User(
            name          = 'Admin',
            email         = default_email,
            password_hash = hash_password('changeme123'),
        )
        db.session.add(user)
        db.session.flush()

        # Create default alert settings
        settings = AlertSetting(user_id=user.id)
        db.session.add(settings)

    # Create monitors for each URL
    for url in urls:
        name = url.replace('https://', '').replace('http://', '').split('/')[0]
        monitor = Monitor(
            user_id = user.id,
            name    = name,
            url     = url,
        )
        db.session.add(monitor)

    db.session.commit()
    logger.info(f'Migrated {len(urls)} URLs to default user ({default_email}). '
                f'Default password: changeme123')


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
