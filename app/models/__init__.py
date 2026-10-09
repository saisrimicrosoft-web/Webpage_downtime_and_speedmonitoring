from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from app.models.check import Check
from app.models.incident import Incident
from app.models.alert import Alert, AlertRule, NotificationChannel, NotificationLog
from app.models.user import User
from app.models.setting import Setting
