from run import app
from app.models import db
from app.models.user import User
from app.utils.auth import hash_password

with app.app_context():
    admin = User.query.filter_by(email='admin@example.com').first()
    if admin:
        admin.password_hash = hash_password('admin123')
        db.session.commit()
        print("Updated admin password hash")
    else:
        print("Admin user not found")
