"""merge ical and recurring branches

Revision ID: 76535cf9a237
Revises: 150c9a78a543, 3c9f1a2b4d8e
Create Date: 2026-05-15 15:48:04.139228

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '76535cf9a237'
down_revision = ('150c9a78a543', '3c9f1a2b4d8e')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
