from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from app.models.check import Check
from app.models.incident import Incident
