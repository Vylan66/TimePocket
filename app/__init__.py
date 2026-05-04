import click
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    from app.auth import auth_bp as auth_blueprint
    app.register_blueprint(auth_blueprint)

    from app.routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    with app.app_context():
        db.create_all()

    @app.cli.command('seed-availability')
    @click.argument('group_id', type=int)
    def seed_availability(group_id):
        """Insert dummy availability for all members of GROUP_ID."""
        from app.models import Availability, GroupMember
        members = GroupMember.query.filter_by(group_id=group_id).all()
        if not members:
            click.echo(f'No members found in group {group_id}.')
            return
        slots = [
            ('monday',    '09:00', '12:00'),
            ('monday',    '14:00', '17:00'),
            ('tuesday',   '10:00', '13:00'),
            ('wednesday', '09:00', '11:00'),
            ('wednesday', '15:00', '18:00'),
            ('thursday',  '11:00', '14:00'),
            ('friday',    '09:00', '12:00'),
        ]
        count = 0
        for m in members:
            for day, start, end in slots:
                db.session.add(Availability(user_id=m.user_id, day=day, start_time=start, end_time=end))
                count += 1
        db.session.commit()
        click.echo(f'Inserted {count} availability slots across {len(members)} member(s).')

    return app