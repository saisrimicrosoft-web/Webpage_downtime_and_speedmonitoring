from flask import Blueprint, render_template
import json
import os

alerts_page_bp = Blueprint('alerts_page', __name__)

@alerts_page_bp.route('/alerts')
def alerts_page():
    # Load urls for the dropdowns
    urls = []
    try:
        from flask import current_app
        with open(os.path.join(current_app.root_path, '..', 'urls.json'), 'r') as f:
            urls = json.load(f)
    except: pass
    
    return render_template('alerts.html', urls=urls)
