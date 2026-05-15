import uuid
from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash, generate_password_hash
from app import db
from app.models import Availability, User, Group, GroupMember, Friendship, ICalFeed
from app.ical_sync import sync_feed

main = Blueprint('main', __name__)

@main.route('/personal')
@login_required
def personal():
    return render_template('personal.html', pageName="Personal Calendar")

@main.route('/group')
@login_required
def group():
    return render_template('group.html', pageName="Groups")

@main.route('/friends')
@login_required
def friends():
    return render_template('friends.html', pageName="Friends")

@main.route('/dashboard')
@login_required
def dashboard():
    all_users = User.query.all()
    my_availability = Availability.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', users=all_users, my_availability=my_availability, pageName="Dashboard")

@main.route('/profile')
@login_required
def profile():
    return render_template('profile.html', pageName="Profile")

@main.route('/availability', methods=['GET'])
@login_required
def get_my_availability():
    slots = Availability.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        'id':                  s.id,
        'date':                s.date,
        'start_time':          s.start_time,
        'end_time':            s.end_time,
        'title':               s.title or '',
        'category':            s.category or 'Personal',
        'notes':               s.notes or '',
        'is_recurring':        s.is_recurring,
        'recurrence':          s.recurrence or 'none',
        'recurrence_group_id': s.recurrence_group_id,
    } for s in slots])

@main.route('/availability', methods=['POST'])
@login_required
def add_availability():
    data       = request.get_json()
    recurrence = data.get('recurrence', 'none')

    if recurrence != 'none':
        start_date = datetime.strptime(data['date'], '%Y-%m-%d')
        end_date   = start_date.replace(year=start_date.year + 1)
        group_id   = str(uuid.uuid4())
        slots      = []
        current    = start_date

        while current <= end_date:
            slot = Availability(
                user_id             = current_user.id,
                date                = current.strftime('%Y-%m-%d'),
                start_time          = data['start_time'],
                end_time            = data['end_time'],
                title               = data.get('title', ''),
                category            = data.get('category'),
                notes               = data.get('notes'),
                is_recurring        = True,
                recurrence          = recurrence,
                recurrence_end      = end_date.strftime('%Y-%m-%d'),
                recurrence_group_id = group_id,
            )
            db.session.add(slot)
            slots.append(slot)

            if recurrence == 'weekly':
                current += timedelta(weeks=1)
            elif recurrence == 'biweekly':
                current += timedelta(weeks=2)
            elif recurrence == 'monthly':
                month   = current.month + 1
                year    = current.year + (month - 1) // 12
                month   = (month - 1) % 12 + 1
                days    = [31, 29 if year%4==0 and (year%100!=0 or year%400==0) else 28,
                           31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
                current = current.replace(year=year, month=month, day=min(current.day, days[month-1]))

        db.session.commit()
        return jsonify({'message': f'{recurrence} events added!', 'count': len(slots)})

    slot = Availability(
        user_id             = current_user.id,
        date                = data['date'],
        start_time          = data['start_time'],
        end_time            = data['end_time'],
        title               = data.get('title', ''),
        category            = data.get('category'),
        notes               = data.get('notes'),
        is_recurring        = False,
        recurrence          = None,
        recurrence_end      = None,
        recurrence_group_id = None,
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify({'message': 'Availability added!', 'id': slot.id})

@main.route('/availability/<int:slot_id>', methods=['PUT'])
@login_required
def update_availability(slot_id):
    slot = Availability.query.filter_by(id=slot_id, user_id=current_user.id).first_or_404()
    data = request.get_json()
    slot.date       = data.get('date',       slot.date)
    slot.start_time = data.get('start_time', slot.start_time)
    slot.end_time   = data.get('end_time',   slot.end_time)
    slot.title      = data.get('title',      slot.title)
    slot.category   = data.get('category',   slot.category)
    slot.notes      = data.get('notes',      slot.notes)
    db.session.commit()
    return jsonify({'message': 'Availability updated!'})

@main.route('/availability/<int:slot_id>', methods=['DELETE'])
@login_required
def delete_availability(slot_id):
    slot = Availability.query.filter_by(id=slot_id, user_id=current_user.id).first_or_404()
    db.session.delete(slot)
    db.session.commit()
    return jsonify({'message': 'Deleted!'})

@main.route('/availability/recurring/<string:group_id>/from/<string:from_date>', methods=['DELETE'])
@login_required
def delete_recurring_from_date(group_id, from_date):
    slots = Availability.query.filter(
        Availability.recurrence_group_id == group_id,
        Availability.user_id == current_user.id,
        Availability.date >= from_date
    ).all()
    for slot in slots:
        db.session.delete(slot)
    db.session.commit()
    return jsonify({'message': f'Deleted {len(slots)} events from {from_date}'})

@main.route('/availability/recurring/<string:group_id>/from/<string:from_date>', methods=['PUT'])
@login_required
def update_recurring_from_date(group_id, from_date):
    data  = request.get_json()
    slots = Availability.query.filter(
        Availability.recurrence_group_id == group_id,
        Availability.user_id == current_user.id,
        Availability.date >= from_date
    ).all()
    for slot in slots:
        if 'title'      in data: slot.title      = data['title']
        if 'start_time' in data: slot.start_time = data['start_time']
        if 'end_time'   in data: slot.end_time   = data['end_time']
        if 'category'   in data: slot.category   = data['category']
        if 'notes'      in data: slot.notes      = data['notes']
    db.session.commit()
    return jsonify({'message': f'Updated {len(slots)} events'})

@main.route('/availability/all', methods=['GET'])
@login_required
def get_all_availability():
    all_availability = Availability.query.all()
    result = []
    for slot in all_availability:
        result.append({
            'username':   slot.user.username,
            'date':       slot.date,
            'start_time': slot.start_time,
            'end_time':   slot.end_time,
            'title':      slot.title or '',
            'category':   slot.category or 'Personal',
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

    start_str = request.args.get('start')
    end_str   = request.args.get('end')
    if not start_str or not end_str:
        today       = datetime.now().date()
        week_sunday = today - timedelta(days=(today.weekday() + 1) % 7)
        start_str   = week_sunday.strftime('%Y-%m-%d')
        end_str     = (week_sunday + timedelta(days=6)).strftime('%Y-%m-%d')

    avail = Availability.query.filter(
        Availability.user_id.in_(member_ids),
        Availability.date >= start_str,
        Availability.date <= end_str,
    ).all()

    from collections import defaultdict
    user_day_intervals = defaultdict(list)
    for slot in avail:
        try:
            dt      = datetime.strptime(slot.date, '%Y-%m-%d')
            day_idx = (dt.weekday() + 1) % 7
            start_h = int(slot.start_time.split(':')[0])
            end_h   = int(slot.end_time.split(':')[0])
        except (ValueError, AttributeError):
            continue
        user_day_intervals[(slot.user_id, day_idx)].append((start_h, end_h))

    heatmap = {str(i): {} for i in range(7)}
    for (_, day_idx), intervals in user_day_intervals.items():
        intervals.sort()
        merged = []
        for start, end in intervals:
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        day_key = str(day_idx)
        for start, end in merged:
            for h in range(start, end):
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

def _friend_ids():
    rows = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.requester_id == current_user.id, Friendship.status == 'accepted'),
            db.and_(Friendship.receiver_id == current_user.id, Friendship.status == 'accepted'),
        )
    ).all()
    return {(f.receiver_id if f.requester_id == current_user.id else f.requester_id): f.id for f in rows}

@main.route('/api/friends', methods=['GET'])
@login_required
def get_friends():
    id_map = _friend_ids()
    users = User.query.filter(User.id.in_(id_map.keys())).all()
    return jsonify({'friends': [{'id': u.id, 'username': u.username, 'friendship_id': id_map[u.id]} for u in users]})

@main.route('/api/friends/search', methods=['GET'])
@login_required
def search_friends():
    q = (request.args.get('q') or '').strip()
    id_map = _friend_ids()
    if not id_map:
        return jsonify({'users': []})
    query = User.query.filter(User.id.in_(id_map.keys()))
    if q:
        query = query.filter(User.username.ilike(f'%{q}%'))
    return jsonify({'users': [{'id': u.id, 'username': u.username} for u in query.limit(10).all()]})

@main.route('/api/friends/requests', methods=['GET'])
@login_required
def get_friend_requests():
    incoming = Friendship.query.filter_by(receiver_id=current_user.id, status='pending').all()
    outgoing = Friendship.query.filter_by(requester_id=current_user.id, status='pending').all()
    return jsonify({'requests':
        [{'id': f.id, 'user_id': f.requester_id, 'username': f.requester.username, 'direction': 'incoming'} for f in incoming] +
        [{'id': f.id, 'user_id': f.receiver_id,  'username': f.receiver.username,  'direction': 'outgoing'} for f in outgoing]
    })

@main.route('/api/friends/request', methods=['POST'])
@login_required
def send_friend_request():
    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id or user_id == current_user.id:
        return jsonify({'error': 'Invalid user'}), 400
    if not User.query.get(user_id):
        return jsonify({'error': 'User not found'}), 404
    existing = Friendship.query.filter(
        db.or_(
            db.and_(Friendship.requester_id == current_user.id, Friendship.receiver_id == user_id),
            db.and_(Friendship.requester_id == user_id, Friendship.receiver_id == current_user.id),
        )
    ).first()
    if existing:
        return jsonify({'error': 'Request already exists'}), 409
    f = Friendship(requester_id=current_user.id, receiver_id=user_id)
    db.session.add(f)
    db.session.commit()
    return jsonify({'message': 'Friend request sent', 'id': f.id}), 201

@main.route('/api/friends/accept/<int:friendship_id>', methods=['POST'])
@login_required
def accept_friend_request(friendship_id):
    f = Friendship.query.get_or_404(friendship_id)
    if f.receiver_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    f.status = 'accepted'
    db.session.commit()
    return jsonify({'message': 'Accepted'})

@main.route('/api/friends/<int:friendship_id>', methods=['DELETE'])
@login_required
def remove_friend(friendship_id):
    f = Friendship.query.get_or_404(friendship_id)
    if f.requester_id != current_user.id and f.receiver_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(f)
    db.session.commit()
    return jsonify({'message': 'Removed'})

# Profile API routes

@main.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'avatar': current_user.avatar,
        'bio': current_user.bio
    })

@main.route('/api/user', methods=['PUT'])
@login_required
def update_user():
    data = request.get_json()
    if 'username' in data:
        current_user.username = data['username']
    if 'email' in data:
        current_user.email = data['email']
    db.session.commit()
    return jsonify({'message': 'Profile updated!'})

@main.route('/api/user/password', methods=['PUT'])
@login_required
def update_password():
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    if not current_user.check_password(old_password):
        return jsonify({'success': False, 'message': 'Current password is incorrect.'}), 400
    current_user.set_password(new_password)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Password updated!'})

@main.route('/api/user/avatar', methods=['PUT'])
@login_required
def update_avatar():
    data = request.get_json()
    avatar = data.get('avatar')
    if not avatar:
        return jsonify({'success': False, 'message': 'Avatar required.'}), 400
    current_user.avatar = avatar
    db.session.commit()
    return jsonify({'success': True, 'message': 'Avatar updated!'})

@main.route('/api/user/bio', methods=['PUT'])
@login_required
def update_bio():
    data = request.get_json()
    bio = data.get('bio')
    if not bio:
        return jsonify({'success': False, 'message': 'Bio required.'}), 400
    if len(bio) > 200:
        return jsonify({'success': False, 'message': 'Bio must be 200 characters or less.'})
    current_user.bio = bio
    db.session.commit()
    return jsonify({'success': True, 'message': 'Bio updated!'})

# iCal feed routes

@main.route('/api/ical', methods=['GET'])
@login_required
def get_ical():
    feed = ICalFeed.query.filter_by(user_id=current_user.id).first()
    if not feed:
        return jsonify({'feed': None})
    return jsonify({'feed': {
        'id':          feed.id,
        'url':         feed.url,
        'last_synced': feed.last_synced.isoformat() if feed.last_synced else None,
        'is_active':   feed.is_active,
    }})

@main.route('/api/ical', methods=['POST'])
@login_required
def save_ical():
    data = request.get_json()
    url  = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400

    feed = ICalFeed.query.filter_by(user_id=current_user.id).first()
    if feed:
        feed.url       = url
        feed.is_active = True
    else:
        feed = ICalFeed(user_id=current_user.id, url=url)
        db.session.add(feed)
    db.session.flush()
    db.session.commit()

    count, err = sync_feed(feed.id)
    if err:
        return jsonify({'error': err}), 400

    return jsonify({
        'message': f'Calendar connected! {count} events imported.',
        'feed': {
            'id':          feed.id,
            'url':         feed.url,
            'last_synced': feed.last_synced.isoformat() if feed.last_synced else None,
        },
    })

@main.route('/api/ical/sync', methods=['POST'])
@login_required
def sync_ical():
    feed = ICalFeed.query.filter_by(user_id=current_user.id, is_active=True).first()
    if not feed:
        return jsonify({'error': 'No active calendar connected'}), 404
    count, err = sync_feed(feed.id)
    if err:
        return jsonify({'error': err}), 400
    return jsonify({
        'message':     f'Synced! {count} events updated.',
        'last_synced': feed.last_synced.isoformat(),
    })

@main.route('/api/ical', methods=['DELETE'])
@login_required
def delete_ical():
    feed = ICalFeed.query.filter_by(user_id=current_user.id).first()
    if not feed:
        return jsonify({'error': 'No calendar connected'}), 404
    Availability.query.filter_by(user_id=current_user.id, ical_feed_id=feed.id).delete()
    db.session.delete(feed)
    db.session.commit()
    return jsonify({'message': 'Calendar disconnected and imported events removed.'})