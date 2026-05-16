from app.models import User, Availability
from app import db

def test_dashboard_requires_login(client):
    res = client.get('/dashboard')
    assert res.status_code == 302

def test_personal_requires_login(client):
    res = client.get('/personal')
    assert res.status_code == 302

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
