import click
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_mail import Mail
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)

    from app.auth import auth_bp as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from app.routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    with app.app_context():
        db.create_all()

    @app.cli.command('migrate-db')
    def migrate_db():
        """Run database migrations."""
        import os
        from migrations.add_event_details_001 import migrate
        db_path = os.path.join(app.instance_path, 'timepocket.db')
        migrate(db_path)

    @app.cli.command('seed-demo')
    def seed_demo():
        """Create demo users with multi-week events and two groups. password: password123"""
        from app.models import User, Availability, Group, GroupMember
        from datetime import datetime, timedelta

        today = datetime.now().date()
        this_sunday = today - timedelta(days=(today.weekday() + 1) % 7)

        def date_on(week_offset, day_name):
            offsets = {'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                       'thursday': 4, 'friday': 5, 'saturday': 6}
            base = this_sunday + timedelta(weeks=week_offset)
            return (base + timedelta(days=offsets[day_name])).strftime('%Y-%m-%d')

        demo_users = [
            ('alice',   'alice@demo.com',   'password123'),
            ('bob',     'bob@demo.com',     'password123'),
            ('charlie', 'charlie@demo.com', 'password123'),
            ('diana',   'diana@demo.com',   'password123'),
        ]
        for username, email, password in demo_users:
            if not User.query.filter_by(username=username).first():
                u = User(username=username, email=email)
                u.set_password(password)
                db.session.add(u)
        db.session.flush()

        events_by_user = {
            'alice': [
                (0, 'monday',    '09:00', '11:00', 'Morning Lecture',      'Studies'),
                (0, 'monday',    '13:00', '15:00', 'Library Study',        'Studies'),
                (0, 'tuesday',   '10:00', '12:00', 'Yoga Class',           'Health'),
                (0, 'wednesday', '09:00', '17:00', 'Work From Home',       'Work'),
                (0, 'thursday',  '14:00', '16:00', 'Project Group',        'Studies'),
                (0, 'friday',    '10:00', '13:00', 'Part-time Job',        'Work'),
                (-1, 'monday',   '09:00', '11:00', 'Morning Lecture',      'Studies'),
                (-1, 'wednesday','10:00', '12:00', 'Lab Session',          'Studies'),
                (-1, 'friday',   '14:00', '16:00', 'Revision Session',     'Studies'),
                (1, 'tuesday',   '09:00', '11:00', 'Exam Prep',            'Studies'),
                (1, 'wednesday', '09:00', '17:00', 'Work From Home',       'Work'),
                (1, 'thursday',  '10:00', '12:00', 'Group Project',        'Studies'),
                (1, 'friday',    '11:00', '14:00', 'Part-time Job',        'Work'),
                (2, 'monday',    '09:00', '11:00', 'Morning Lecture',      'Studies'),
                (2, 'thursday',  '14:00', '17:00', 'Assignment Sprint',    'Studies'),
            ],
            'bob': [
                (0, 'monday',    '08:00', '10:00', 'Gym',                  'Health'),
                (0, 'tuesday',   '09:00', '12:00', 'Coding Tutorial',      'Studies'),
                (0, 'tuesday',   '14:00', '17:00', 'Internship',           'Work'),
                (0, 'wednesday', '11:00', '13:00', 'Lunch with Friends',   'Social'),
                (0, 'thursday',  '09:00', '12:00', 'Morning Classes',      'Studies'),
                (0, 'friday',    '15:00', '18:00', 'Board Game Night',     'Social'),
                (-1, 'tuesday',  '09:00', '12:00', 'Coding Tutorial',      'Studies'),
                (-1, 'thursday', '14:00', '17:00', 'Internship',           'Work'),
                (-1, 'saturday', '12:00', '15:00', 'Hackathon',            'Studies'),
                (1, 'monday',    '08:00', '10:00', 'Gym',                  'Health'),
                (1, 'wednesday', '09:00', '12:00', 'Code Review',          'Work'),
                (1, 'friday',    '14:00', '17:00', 'Movie Night',          'Social'),
                (2, 'tuesday',   '10:00', '13:00', 'Sprint Planning',      'Work'),
                (2, 'friday',    '15:00', '18:00', 'Board Game Night',     'Social'),
            ],
            'charlie': [
                (0, 'monday',    '10:00', '12:00', 'Design Workshop',      'Studies'),
                (0, 'tuesday',   '13:00', '15:00', 'Café Study',           'Studies'),
                (0, 'wednesday', '09:00', '11:00', 'Morning Run',          'Health'),
                (0, 'wednesday', '14:00', '17:00', 'Part-time Shift',      'Work'),
                (0, 'thursday',  '10:00', '14:00', 'Research Session',     'Studies'),
                (0, 'saturday',  '11:00', '14:00', 'BBQ with Friends',     'Social'),
                (-1, 'monday',   '10:00', '12:00', 'Design Workshop',      'Studies'),
                (-1, 'friday',   '09:00', '12:00', 'Portfolio Review',     'Studies'),
                (1, 'monday',    '09:00', '12:00', 'Client Presentation',  'Work'),
                (1, 'tuesday',   '13:00', '15:00', 'Café Study',           'Studies'),
                (1, 'wednesday', '09:00', '11:00', 'Morning Run',          'Health'),
                (1, 'wednesday', '14:00', '18:00', 'Full-day Shift',       'Work'),
                (1, 'saturday',  '10:00', '13:00', 'Photography Walk',     'Personal'),
                (2, 'wednesday', '09:00', '17:00', 'Full-day Shift',       'Work'),
                (2, 'saturday',  '12:00', '15:00', 'Beach Day',            'Social'),
            ],
            'diana': [
                (0, 'monday',    '09:00', '12:00', 'Team Stand-up',        'Work'),
                (0, 'tuesday',   '11:00', '13:00', 'Finance Review',       'Finance'),
                (0, 'wednesday', '10:00', '12:00', 'Study Group',          'Studies'),
                (0, 'thursday',  '09:00', '11:00', 'Pilates Class',        'Health'),
                (0, 'thursday',  '15:00', '18:00', 'Client Meeting',       'Work'),
                (0, 'friday',    '11:00', '14:00', 'Networking Event',     'Social'),
                (-1, 'monday',   '09:00', '12:00', 'Team Stand-up',        'Work'),
                (-1, 'wednesday','10:00', '12:00', 'Study Group',          'Studies'),
                (-1, 'friday',   '11:00', '14:00', 'Networking Event',     'Social'),
                (1, 'monday',    '09:00', '11:00', 'Budget Review',        'Finance'),
                (1, 'tuesday',   '14:00', '16:00', 'Finance Review',       'Finance'),
                (1, 'thursday',  '09:00', '11:00', 'Pilates Class',        'Health'),
                (1, 'thursday',  '13:00', '17:00', 'Quarterly Report',     'Work'),
                (2, 'monday',    '09:00', '12:00', 'Team Stand-up',        'Work'),
                (2, 'wednesday', '11:00', '14:00', 'Strategy Session',     'Work'),
            ],
        }

        count = 0
        for username, slots in events_by_user.items():
            user = User.query.filter_by(username=username).first()
            if not user:
                continue
            for week_off, day_name, start, end, title, category in slots:
                db.session.add(Availability(
                    user_id=user.id,
                    date=date_on(week_off, day_name),
                    start_time=start, end_time=end,
                    title=title, category=category,
                ))
                count += 1

        alice = User.query.filter_by(username='alice').first()
        if alice and not Group.query.filter_by(name='Study Group Demo').first():
            g1 = Group(name='Study Group Demo', created_by=alice.id)
            db.session.add(g1)
            db.session.flush()
            for uname in ('alice', 'bob', 'charlie', 'diana'):
                u = User.query.filter_by(username=uname).first()
                if u:
                    db.session.add(GroupMember(
                        group_id=g1.id, user_id=u.id,
                        role='owner' if u.id == alice.id else 'member',
                    ))

        bob = User.query.filter_by(username='bob').first()
        if bob and not Group.query.filter_by(name='Dev Team').first():
            g2 = Group(name='Dev Team', created_by=bob.id)
            db.session.add(g2)
            db.session.flush()
            for uname in ('bob', 'charlie'):
                u = User.query.filter_by(username=uname).first()
                if u:
                    db.session.add(GroupMember(
                        group_id=g2.id, user_id=u.id,
                        role='owner' if u.id == bob.id else 'member',
                    ))

        db.session.commit()
        click.echo(f'Demo data seeded: 4 users, {count} events, 2 groups.')
        click.echo('Login: alice / bob / charlie / diana  —  password: password123')

    @app.cli.command('seed-availability')
    @click.argument('group_id', type=int)
    def seed_availability(group_id):
        """Insert dummy availability for all members of GROUP_ID."""
        from app.models import Availability, GroupMember
        from datetime import datetime, timedelta
        members = GroupMember.query.filter_by(group_id=group_id).all()
        if not members:
            click.echo(f'No members found in group {group_id}.')
            return
        today = datetime.now().date()
        this_sunday = today - timedelta(days=(today.weekday() + 1) % 7)
        day_offset = {'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5}
        slots = [
            ('monday',    '09:00', '12:00', 'Morning Study',    'Studies'),
            ('monday',    '14:00', '17:00', 'Afternoon Work',   'Work'),
            ('tuesday',   '10:00', '13:00', 'Project Meeting',  'Studies'),
            ('wednesday', '09:00', '11:00', 'Gym Session',      'Health'),
            ('wednesday', '15:00', '18:00', 'Team Standup',     'Work'),
            ('thursday',  '11:00', '14:00', 'Lunch Social',     'Social'),
            ('friday',    '09:00', '12:00', 'Research Time',    'Studies'),
        ]
        count = 0
        for m in members:
            for day_name, start, end, title, category in slots:
                event_date = (this_sunday + timedelta(days=day_offset[day_name])).strftime('%Y-%m-%d')
                db.session.add(Availability(
                    user_id=m.user_id, date=event_date,
                    start_time=start, end_time=end,
                    title=title, category=category,
                ))
                count += 1
        db.session.commit()
        click.echo(f'Inserted {count} availability slots across {len(members)} member(s).')

    return app