from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.repositories.monitoring_repository import CheckRepository
from app.utils.url_validator import is_valid_url
from config import load_urls, save_urls
import urllib.parse

websites_bp = Blueprint('websites', __name__, url_prefix='/websites')


@websites_bp.route('/')
def index():
    urls = load_urls()
    latest_checks = CheckRepository.get_latest_check_per_url()
    latest_map = {c.url: c for c in latest_checks}

    websites = []
    for url in urls:
        check = latest_map.get(url)
        websites.append({
            'url': url,
            'is_up': check.is_up if check else None,
            'response_ms': check.response_ms if check else None,
            'checked_at': check.checked_at if check else None,
        })

    return render_template('websites.html', websites=websites)


@websites_bp.route('/add', methods=['GET', 'POST'])
def add_url():
    if request.method == 'POST':
        url = request.form.get('url', '').strip()

        if not url:
            flash('URL is required.', 'error')
            return render_template('url_form.html')

        if not is_valid_url(url):
            flash('Invalid URL. Must start with http:// or https://', 'error')
            return render_template('url_form.html', url=url)

        urls = load_urls()
        if url in urls:
            flash('This URL is already being monitored.', 'error')
            return render_template('url_form.html', url=url)

        urls.append(url)
        save_urls(urls)
        flash(f'Added {url} to monitoring.', 'success')
        return redirect(url_for('websites.index'))

    return render_template('url_form.html')


@websites_bp.route('/remove', methods=['POST'])
def remove_url():
    url = request.form.get('url', '').strip()
    urls = load_urls()
    if url in urls:
        urls.remove(url)
        save_urls(urls)
        flash(f'Removed {url} from monitoring.', 'success')
    else:
        flash('URL not found.', 'error')
    return redirect(url_for('websites.index'))


@websites_bp.route('/details')
def details():
    url = request.args.get('url', '')
    if not url:
        flash('No URL specified.', 'error')
        return redirect(url_for('websites.index'))

    checks = CheckRepository.get_checks_for_url(url, limit=50)
    latest = checks[0] if checks else None

    return render_template('url_details.html', url=url, checks=checks, latest=latest)
