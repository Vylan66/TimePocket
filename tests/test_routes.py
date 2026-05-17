from app.models import User, Availability
from app import db

def test_add_availability(auth_client):
    res = auth_client.post('/availability', json={
        'date': '2026-06-01',
        'start_time': '09:00',
        'end_time': '11:00',
        'title': 'Test Event',
        'category': 'Work',
        'notes': '',
        'recurrence': 'none',
    })
    assert res.status_code == 200
    assert res.get_json()['message'] == 'Availability added!'

def test_get_my_availability(auth_client):
    auth_client.post('/availability', json={
        'date': '2026-06-01',
        'start_time': '09:00',
        'end_time': '11:00',
        'title': 'Test Event',
        'category': 'Work',
        'notes': '',
        'recurrence': 'none',
    })
    res = auth_client.get('/availability')
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]['title'] == 'Test Event'

def test_delete_availability(auth_client):
    auth_client.post('/availability', json={
        'date': '2026-06-01',
        'start_time': '09:00',
        'end_time': '11:00',
        'title': 'To Delete',
        'category': 'Work',
        'notes': '',
        'recurrence': 'none',
    })
    res = auth_client.get('/availability')
    slot_id = res.get_json()[0]['id']
    del_res = auth_client.delete(f'/availability/{slot_id}')
    assert del_res.status_code == 200
    assert del_res.get_json()['message'] == 'Deleted!'

def test_update_availability(auth_client):
    auth_client.post('/availability', json={
        'date': '2026-06-01',
        'start_time': '09:00',
        'end_time': '11:00',
        'title': 'Original',
        'category': 'Work',
        'notes': '',
        'recurrence': 'none',
    })
    res = auth_client.get('/availability')
    slot_id = res.get_json()[0]['id']
    upd_res = auth_client.put(f'/availability/{slot_id}', json={
        'title': 'Updated',
        'date': '2026-06-01',
        'start_time': '10:00',
        'end_time': '12:00',
        'category': 'Personal',
        'notes': '',
    })
    assert upd_res.status_code == 200
    assert upd_res.get_json()['message'] == 'Availability updated!'

def test_recurring_availability(auth_client):
    res = auth_client.post('/availability', json={
        'date': '2026-06-01',
        'start_time': '09:00',
        'end_time': '10:00',
        'title': 'Weekly Meeting',
        'category': 'Work',
        'notes': '',
        'recurrence': 'weekly',
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data['count'] > 1

def test_get_user_profile(auth_client):
    res = auth_client.get('/api/user')
    assert res.status_code == 200
    data = res.get_json()
    assert data['username'] == 'testuser'
    assert data['email'] == 'test@test.com'

def test_update_username(auth_client):
    res = auth_client.put('/api/user', json={'username': 'newusername'})
    assert res.status_code == 200
    assert res.get_json()['message'] == 'Profile updated!'

def test_create_group(auth_client):
    res = auth_client.post('/groups', json={'name': 'Test Group'})
    assert res.status_code == 201
    assert res.get_json()['name'] == 'Test Group'

def test_get_groups(auth_client):
    auth_client.post('/groups', json={'name': 'My Group'})
    res = auth_client.get('/groups')
    assert res.status_code == 200
    data = res.get_json()
    assert len(data['groups']) == 1

def test_send_friend_request(auth_client, app):
    with app.app_context():
        other = User(username='otheruser', email='other@test.com', is_verified=True)
        other.set_password('password123')
        db.session.add(other)
        db.session.commit()
        other_id = other.id
    res = auth_client.post('/api/friends/request', json={'user_id': other_id})
    assert res.status_code == 201
    assert res.get_json()['message'] == 'Friend request sent'

def test_get_ical_no_feed(auth_client):
    res = auth_client.get('/api/ical')
    assert res.status_code == 200
    assert res.get_json()['feed'] is None

def test_delete_ical_no_feed(auth_client):
    res = auth_client.delete('/api/ical')
    assert res.status_code == 404
    assert res.get_json()['error'] == 'No calendar connected'