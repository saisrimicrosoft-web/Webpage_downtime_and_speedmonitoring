import os
from flask import Flask
from config import Config
from app.models import db
from app.routes.dashboard import dashboard_bp
from app.routes.websites import websites_bp
from app.routes.api import api_bp
from app.scheduler.scheduler import start_scheduler
from app.utils.logging_config import setup_logging


def create_app(config_class=Config):
    setup_logging()

    app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(websites_bp)
    app.register_blueprint(api_bp, url_prefix='/api')

    # Setup database and scheduler
    with app.app_context():
        os.makedirs(app.instance_path, exist_ok=True)
        db.create_all()

        # Start the background scheduler
        if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
            start_scheduler(app)

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
