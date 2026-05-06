from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from app import db
from app.models import Availability, User, Group, GroupMember

main = Blueprint('main', __name__)

@main.route('/personal')
@login_required
def personal():
    return render_template('personal.html')

@main.route('/group')
@login_required
def group():
    return render_template('group.html')

@main.route('/dashboard')
@login_required
def dashboard():
    all_users = User.query.all()
    my_availability = Availability.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', users=all_users, my_availability=my_availability)

@main.route('/availability', methods=['GET'])
@login_required
def get_my_availability():
    slots = Availability.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id': s.id,
        'day': s.day,
        'start_time': s.start_time,
        'end_time': s.end_time
    } for s in slots])

@main.route('/test/dashboard')
def dashboardTest():
    return render_template('dashboard.html')

@main.route('/test/profile')
def profileTest():
    return render_template('profile.html')

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

@main.route('/availability/<int:slot_id>', methods=['PUT'])
@login_required
def update_availability(slot_id):
    slot = Availability.query.get_or_404(slot_id)
    data = request.get_json()
    slot.day = data.get('day', slot.day)
    slot.start_time = data.get('start_time', slot.start_time)
    slot.end_time = data.get('end_time', slot.end_time)
    db.session.commit()
    return jsonify({'message': 'Availability updated!'})

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

# Group routes

@main.route('/groups', methods=['GET'])
@login_required
def get_groups():
    memberships = GroupMember.query.filter_by(user_id=current_user.id).all()
    groups = []
    for m in memberships:
        g = m.group
        groups.append({'id': g.id, 'name': g.name, 'role': m.role, 'member_count': len(g.members)})
    return jsonify({'groups': groups})

@main.route('/groups', methods=['POST'])
@login_required
def create_group():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Name required'}), 400
    group = Group(name=name, created_by=current_user.id)
    db.session.add(group)
    db.session.flush()
    db.session.add(GroupMember(group_id=group.id, user_id=current_user.id, role='owner'))
    for uid in data.get('member_ids', []):
        if uid != current_user.id:
            db.session.add(GroupMember(group_id=group.id, user_id=uid, role='member'))
    db.session.commit()
    return jsonify({'id': group.id, 'name': group.name}), 201

@main.route('/groups/<int:group_id>', methods=['GET'])
@login_required
def get_group(group_id):
    GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    group = Group.query.get_or_404(group_id)
    return jsonify({
        'id': group.id,
        'name': group.name,
        'created_by': group.created_by,
        'members': [{'id': m.user_id, 'username': m.user.username, 'role': m.role} for m in group.members]
    })

@main.route('/groups/<int:group_id>', methods=['PUT'])
@login_required
def update_group(group_id):
    m = GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    if m.role != 'owner':
        return jsonify({'error': 'Owners only'}), 403
    group = Group.query.get_or_404(group_id)
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if name:
        group.name = name
    db.session.commit()
    return jsonify({'id': group.id, 'name': group.name})

@main.route('/groups/<int:group_id>', methods=['DELETE'])
@login_required
def delete_group(group_id):
    m = GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    if m.role != 'owner':
        return jsonify({'error': 'Owners only'}), 403
    db.session.delete(Group.query.get_or_404(group_id))
    db.session.commit()
    return jsonify({'message': 'Deleted'})

@main.route('/groups/<int:group_id>/members', methods=['POST'])
@login_required
def add_group_member(group_id):
    m = GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    if m.role != 'owner':
        return jsonify({'error': 'Owners only'}), 403
    data = request.get_json()
    uid = data.get('user_id')
    if not uid:
        return jsonify({'error': 'user_id required'}), 400
    if GroupMember.query.filter_by(group_id=group_id, user_id=uid).first():
        return jsonify({'error': 'Already a member'}), 400
    db.session.add(GroupMember(group_id=group_id, user_id=uid, role='member'))
    db.session.commit()
    return jsonify({'message': 'Added'}), 201

@main.route('/groups/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
@login_required
def remove_group_member(group_id, user_id):
    m = GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    if m.role != 'owner' and user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id).first_or_404()
    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Removed'})

@main.route('/groups/<int:group_id>/heatmap', methods=['GET'])
@login_required
def group_heatmap(group_id):
    GroupMember.query.filter_by(group_id=group_id, user_id=current_user.id).first_or_404()
    members = GroupMember.query.filter_by(group_id=group_id).all()
    member_ids = [m.user_id for m in members]
    total = len(member_ids)
    avail = Availability.query.filter(Availability.user_id.in_(member_ids)).all()
    day_map = {
        'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    }
    heatmap = {str(i): {} for i in range(7)}
    for slot in avail:
        try:
            day_idx = int(slot.day)
        except (ValueError, TypeError):
            day_idx = day_map.get(str(slot.day).lower(), -1)
        if day_idx < 0 or day_idx > 6:
            continue
        try:
            start_h = int(slot.start_time.split(':')[0])
            end_h = int(slot.end_time.split(':')[0])
        except (ValueError, AttributeError):
            continue
        day_key = str(day_idx)
        for h in range(start_h, end_h):
            heatmap[day_key][str(h)] = heatmap[day_key].get(str(h), 0) + 1
    return jsonify({'heatmap': heatmap, 'total': total})

@main.route('/users/search', methods=['GET'])
@login_required
def search_users():
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify({'users': []})
    users = User.query.filter(
        User.username.ilike(f'%{q}%'),
        User.id != current_user.id
    ).limit(10).all()
    return jsonify({'users': [{'id': u.id, 'username': u.username} for u in users]})

@main.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

# Profile API routes

@main.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email
    })

