from flask import Blueprint, render_template
from app.repositories.monitoring_repository import CheckRepository
from config import load_urls

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/')
def index():
    urls = load_urls()
    latest_checks = CheckRepository.get_latest_check_per_url()
    summary = CheckRepository.get_summary()

    # Build a map of url -> latest check for the template
    latest_map = {c.url: c for c in latest_checks}

    # Build website list for the table
    websites = []
    for url in urls:
        check = latest_map.get(url)
        websites.append({
            'url': url,
            'is_up': check.is_up if check else None,
            'status_code': check.status_code if check else None,
            'response_ms': check.response_ms if check else None,
            'ssl_days_left': check.ssl_days_left if check else None,
            'checked_at': check.checked_at if check else None,
        })

    return render_template('dashboard.html',
                           websites=websites,
                           summary=summary)
