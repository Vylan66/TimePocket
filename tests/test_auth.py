from app.models import User
from app import db


def test_login_success(auth_client):
    res = auth_client.get('/personal')
    assert res.status_code == 200

def test_login_wrong_password(client, app):
    with app.app_context():
        user = User(username='testuser', email='test@test.com', is_verified=True)
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
    res = client.post('/login', json={'email': 'test@test.com', 'password': 'wrongpass'})
    assert res.get_json()['success'] == False

def test_login_unverified_blocked(client, app):
    with app.app_context():
        user = User(username='unverified', email='unverified@test.com', is_verified=False)
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()
    res = client.post('/login', json={'email': 'unverified@test.com', 'password': 'password123'})
    assert res.get_json()['success'] == False

def test_logout(auth_client):
    res = auth_client.get('/logout')
    assert res.status_code == 302
