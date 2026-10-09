import os

filepath = r'app/routes/settings_api.py'
with open(filepath, 'r') as f:
    content = f.read()

# Add imports if not present
if 'from flask import g' not in content:
    content = content.replace('from flask import Blueprint', 'from flask import Blueprint, g')
if 'from app.utils.auth import require_auth' not in content:
    content = content.replace('import requests', 'import requests\nfrom app.utils.auth import require_auth')

# Add @require_auth to routes
routes_to_protect = [
    "@settings_api_bp.route('/settings', methods=['GET'])",
    "@settings_api_bp.route('/settings', methods=['PUT'])",
    "@settings_api_bp.route('/settings/profile', methods=['GET'])",
    "@settings_api_bp.route('/settings/profile', methods=['PUT'])",
    "@settings_api_bp.route('/settings/profile/password', methods=['PUT'])",
    "@settings_api_bp.route('/settings/profile/avatar', methods=['POST'])",
    "@settings_api_bp.route('/settings/profile/avatar', methods=['DELETE'])",
    "@settings_api_bp.route('/settings/notifications/test', methods=['POST'])",
    "@settings_api_bp.route('/data/export', methods=['GET'])",
    "@settings_api_bp.route('/settings/data/purge', methods=['POST'])"
]

for route in routes_to_protect:
    if f"{route}\n@require_auth" not in content:
        content = content.replace(route, f"{route}\n@require_auth")

# Replace User.query.first() with User.query.get(g.current_user_id)
content = content.replace('User.query.first()', 'User.query.get(g.current_user_id)')

with open(filepath, 'w') as f:
    f.write(content)

print("settings_api.py updated!")
