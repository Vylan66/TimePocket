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

def test_register(client):
    res = client.post('/register', json={
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'password123'
    })
    assert res.status_code == 200
    assert res.get_json()['success'] == True

def test_login(client):
    client.post('/register', json={
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'password123'
    })
    res = client.post('/login', json={
        'email': 'test@test.com',
        'password': 'password123'
    })
    assert res.status_code == 200
    assert res.get_json()['success'] == True

def test_login_wrong_password(client):
    client.post('/register', json={
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'password123'
    })
    res = client.post('/login', json={
        'email': 'test@test.com',
        'password': 'wrongpassword'
    })
    assert res.get_json()['success'] == False