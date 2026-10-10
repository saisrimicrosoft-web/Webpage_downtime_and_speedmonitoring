from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Legacy models (URL-level, no user scope — kept for backward compat)
from backend.models.check import Check
from backend.models.incident import Incident

# New user-scoped models
from backend.models.user import User
from backend.models.monitor import Monitor
from backend.models.user_check import UserCheck
from backend.models.user_incident import UserIncident
from backend.models.alert_setting import AlertSetting
from backend.models.alert import Alert, AlertRule, NotificationChannel, NotificationLog
from backend.models.setting import Setting
from backend.models.ssl_check import SSLCheck
