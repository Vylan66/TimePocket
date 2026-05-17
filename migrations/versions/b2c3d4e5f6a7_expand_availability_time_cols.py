"""expand availability start_time/end_time to support allday sentinel

Revision ID: b2c3d4e5f6a7
Revises: 11b47b263a7d
Create Date: 2026-05-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = '11b47b263a7d'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('availability', schema=None) as batch_op:
        batch_op.alter_column('start_time', type_=sa.String(10), existing_type=sa.String(5), existing_nullable=False)
        batch_op.alter_column('end_time',   type_=sa.String(10), existing_type=sa.String(5), existing_nullable=False)


def downgrade():
    with op.batch_alter_table('availability', schema=None) as batch_op:
        batch_op.alter_column('start_time', type_=sa.String(5), existing_type=sa.String(10), existing_nullable=False)
        batch_op.alter_column('end_time',   type_=sa.String(5), existing_type=sa.String(10), existing_nullable=False)
