"""add ical feed table and availability ical columns

Revision ID: 3c9f1a2b4d8e
Revises: fb09d0567d85
Create Date: 2026-05-15 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '3c9f1a2b4d8e'
down_revision = 'fb09d0567d85'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ical_feed',
        sa.Column('id',          sa.Integer(),  nullable=False),
        sa.Column('user_id',     sa.Integer(),  nullable=False),
        sa.Column('url',         sa.Text(),     nullable=False),
        sa.Column('last_synced', sa.DateTime(), nullable=True),
        sa.Column('is_active',   sa.Boolean(),  nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    with op.batch_alter_table('availability') as batch_op:
        batch_op.add_column(sa.Column('ical_uid',     sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('ical_feed_id', sa.Integer(),          nullable=True))


def downgrade():
    with op.batch_alter_table('availability') as batch_op:
        batch_op.drop_column('ical_feed_id')
        batch_op.drop_column('ical_uid')
    op.drop_table('ical_feed')
