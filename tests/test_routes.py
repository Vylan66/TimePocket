import pytest
from app import create_app, db

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def register_and_login(client):
    client.post('/register', json={
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'password123'
    })
    client.post('/login', json={
        'email': 'test@test.com',
        'password': 'password123'
    })

def test_dashboard_requires_login(client):
    res = client.get('/dashboard')
    assert res.status_code == 302

def test_add_availability(client):
    register_and_login(client)
    res = client.post('/availability', json={
        'day': 'Monday',
        'start_time': '09:00',
        'end_time': '11:00'
    })
    assert res.status_code == 200
    assert res.get_json()['message'] == 'Availability added!'

def test_get_all_availability(client):
    register_and_login(client)
    client.post('/availability', json={
        'day': 'Monday',
        'start_time': '09:00',
        'end_time': '11:00'
    })
    res = client.get('/availability/all')
    data = res.get_json()
    assert len(data) == 1
    assert data[0]['day'] == 'Monday'