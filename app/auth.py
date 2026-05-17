from flask import Blueprint, render_template, redirect, url_for, request, jsonify
from flask_login import login_user, logout_user, login_required
from flask_mail import Message
from app import db, mail, csrf
from app.models import User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/')
def index():
    return render_template('index.html')

@auth_bp.route('/register', methods=['POST'])
@csrf.exempt
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already registered.'})
    
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken."})

    new_user = User(username=username, email=email)
    new_user.set_password(password)
    token = new_user.generate_verification_token()
    db.session.add(new_user)
    db.session.commit()

    verify_url = url_for('auth.verify_email', token=token, _external=True)
    msg = Message(
        subject='Verify your TimePocket account',
        recipients=[email],
        body=f'Hi {username}!\n\nClick the link below to verify your email:\n{verify_url}\n\nIf you didn\'t create this account, ignore this email.'
    )
    mail.send(msg)

    login_user(new_user)
    return jsonify({'success': True})

@auth_bp.route('/verify/<token>')
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return 'Invalid or expired verification link.', 400
    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    return redirect(url_for('main.personal'))

@auth_bp.route('/login', methods=['POST'])
@csrf.exempt
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid credentials.'})

    if not user.is_verified:
        return jsonify({'success': False, 'message': 'Please verify your email before logging in.'})

    login_user(user)
    return jsonify({'success': True})

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.index'))