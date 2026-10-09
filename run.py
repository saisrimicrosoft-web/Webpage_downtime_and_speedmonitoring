import os
import logging
from flask import Flask
from flask_cors import CORS
from config import Config
from app.models import db
from app.routes.dashboard import dashboard_bp
from app.routes.websites import websites_bp
from app.routes.api import api_bp
from app.routes.uptime import uptime_bp
from app.routes.auth import auth_bp
from app.routes.monitors import monitors_bp
from app.routes.profile import profile_bp
from app.routes.alerts import alerts_bp
from app.scheduler.scheduler import start_scheduler
from app.utils.logging_config import setup_logging

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
    
    from app.routes.alerts_page import alerts_page_bp
    app.register_blueprint(alerts_page_bp)

    from app.routes.settings_api import settings_api_bp
    app.register_blueprint(settings_api_bp, url_prefix='/api')
    
    from app.routes.settings_page import settings_page_bp
    app.register_blueprint(settings_page_bp)

    # Setup database (create all tables) and seed default user
    with app.app_context():
        os.makedirs(app.instance_path, exist_ok=True)
        db.create_all()
        _migrate_legacy_data()

        from app.models.user import User
        from werkzeug.security import generate_password_hash
        if not User.query.first():
            admin = User(name='DevOps Admin', email='admin@example.com', password_hash=generate_password_hash('admin123'))
            db.session.add(admin)
            db.session.commit()

        from app.services.settings_service import SettingsService
        SettingsService.seed_defaults()
        # Start the background scheduler
        if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
            start_scheduler(app)

    return app


def _migrate_legacy_data():
    """
    One-time migration: if urls.json has URLs and no monitors exist yet,
    create a default user and migrate those URLs as monitors.
    Safe to run repeatedly — skips if migration already done.
    """
    from app.models.user import User
    from app.models.monitor import Monitor
    from app.models.alert_setting import AlertSetting
    from app.utils.auth import hash_password
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
