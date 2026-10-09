from flask import Blueprint, render_template

auth_page_bp = Blueprint('auth_page', __name__)

@auth_page_bp.route('/login')
@auth_page_bp.route('/signup')
def login():
    return render_template('login.html')
