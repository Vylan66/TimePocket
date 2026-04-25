from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models import Availability, User

main = Blueprint('main', __name__)

@main.route('/dashboard')
@login_required
def dashboard():
    all_users = User.query.all()
    my_availability = Availability.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', users=all_users, my_availability=my_availability)

@main.route('/availability', methods=['POST'])
@login_required
def add_availability():
    data = request.get_json()
    slot = Availability(
        user_id=current_user.id,
        day=data['day'],
        start_time=data['start_time'],
        end_time=data['end_time']
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify({'message': 'Availability added!'})

@main.route('/availability/<int:slot_id>', methods=['DELETE'])
@login_required
def delete_availability(slot_id):
    slot = Availability.query.get_or_404(slot_id)
    db.session.delete(slot)
    db.session.commit()
    return jsonify({'message': 'Deleted!'})

@main.route('/availability/all', methods=['GET'])
@login_required
def get_all_availability():
    all_availability = Availability.query.all()
    result = []
    for slot in all_availability:
        result.append({
            'username': slot.user.username,
            'day': slot.day,
            'start_time': slot.start_time,
            'end_time': slot.end_time
        })
    return jsonify(result)