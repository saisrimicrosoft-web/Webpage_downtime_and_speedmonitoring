import sys
import os
from datetime import datetime, timedelta, timezone
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from run import create_app
from app.models import db
from app.models.alert import Alert, AlertRule, NotificationChannel
import json

def seed_database():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("Ensured tables exist.")

        # Seed Notification Channels
        if NotificationChannel.query.count() == 0:
            in_app_channel = NotificationChannel(type='in_app', target='dashboard', enabled=True)
            db.session.add(in_app_channel)
            db.session.commit()
            print("Seeded 'in_app' NotificationChannel.")

        # Seed global alert rules
        if AlertRule.query.count() == 0:
            global_rule = AlertRule(
                website_id=None,
                consecutive_failures_threshold=2,
                slow_response_ms=2000,
                ssl_warning_days=14,
                cooldown_minutes=15,
                enabled=True
            )
            db.session.add(global_rule)
            db.session.commit()
            print("Seeded global AlertRule.")

        # Read urls.json for generating sample data
        urls = []
        try:
            with open(os.path.join(app.root_path, '..', 'urls.json'), 'r') as f:
                urls = json.load(f)
        except Exception:
            urls = ["https://api.pulseguard.io", "https://app.acme-store.com", "tcp://db.acme-store.com:5432", "https://checkout.acme-store.com"]

        if urls and Alert.query.count() == 0:
            now = datetime.now(timezone.utc)
            alerts = []

            # Create 3 active alerts
            for i in range(3):
                url = random.choice(urls)
                alerts.append(Alert(
                    website_id=url,
                    type=random.choice(['down', 'ssl_expiring', 'slow_response', 'degraded']),
                    severity=random.choice(['critical', 'warning']),
                    status='active',
                    title=f"Sample Active Alert {i+1}",
                    message="This is an auto-generated active alert for testing.",
                    started_at=now - timedelta(minutes=random.randint(5, 60)),
                    http_code=random.choice([None, 500, 502, 503]),
                    response_time_ms=random.randint(100, 5000),
                    notified_channels="in_app"
                ))

            # Create some acknowledged alerts
            for i in range(2):
                url = random.choice(urls)
                started = now - timedelta(hours=random.randint(1, 10))
                alerts.append(Alert(
                    website_id=url,
                    type='down',
                    severity='critical',
                    status='acknowledged',
                    title=f"Sample Acknowledged Alert {i+1}",
                    message="This is an acknowledged alert.",
                    started_at=started,
                    acknowledged_at=started + timedelta(minutes=random.randint(5, 20)),
                    acknowledged_by="admin@example.com",
                    notified_channels="in_app"
                ))

            # Create some resolved alerts
            for i in range(10):
                url = random.choice(urls)
                started = now - timedelta(days=random.randint(1, 20))
                resolved = started + timedelta(minutes=random.randint(15, 120))
                alerts.append(Alert(
                    website_id=url,
                    type=random.choice(['down', 'slow_response']),
                    severity='warning',
                    status='resolved',
                    title=f"Sample Resolved Alert {i+1}",
                    message="This alert has been resolved.",
                    started_at=started,
                    resolved_at=resolved,
                    duration_seconds=int((resolved - started).total_seconds()),
                    notified_channels="in_app"
                ))

            db.session.bulk_save_objects(alerts)
            db.session.commit()
            print(f"Seeded {len(alerts)} sample alerts.")

        print(f"Alerts in DB: {Alert.query.count()}")
        print(f"Alert Rules in DB: {AlertRule.query.count()}")
        print(f"Notification Channels in DB: {NotificationChannel.query.count()}")

if __name__ == '__main__':
    seed_database()
