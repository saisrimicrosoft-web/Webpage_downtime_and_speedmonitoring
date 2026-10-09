from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Legacy models (URL-level, no user scope — kept for backward compat)
from app.models.check import Check
from app.models.incident import Incident
# New user-scoped models
from app.models.user import User
from app.models.monitor import Monitor
from app.models.user_check import UserCheck
from app.models.user_incident import UserIncident
from app.models.alert_setting import AlertSetting
from app.models.alert import Alert, AlertRule, NotificationChannel, NotificationLog
from app.models.setting import Setting
