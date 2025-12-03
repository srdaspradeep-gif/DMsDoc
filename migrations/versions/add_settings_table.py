"""add app_settings table

Revision ID: add_settings_table
Revises: e02a5afd46dc
Create Date: 2025-12-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_settings_table'
down_revision = 'e02a5afd46dc'
branch_labels = None
depends_on = None


def upgrade():
    # Create app_settings table
    op.create_table(
        'app_settings',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('account_id', sa.String(26), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('app_name', sa.String(100), nullable=False, server_default='DocFlow'),
        sa.Column('app_title', sa.String(200), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('favicon_url', sa.String(500), nullable=True),
        sa.Column('primary_color', sa.String(20), nullable=False, server_default='#2563eb'),
        sa.Column('smtp_host', sa.String(200), nullable=True),
        sa.Column('smtp_port', sa.Integer, nullable=True, server_default='587'),
        sa.Column('smtp_user', sa.String(200), nullable=True),
        sa.Column('smtp_password', sa.Text, nullable=True),
        sa.Column('smtp_from_email', sa.String(200), nullable=True),
        sa.Column('smtp_from_name', sa.String(100), nullable=True),
        sa.Column('smtp_use_tls', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_app_settings_id', 'app_settings', ['id'], unique=True)
    op.create_index('ix_app_settings_account_id', 'app_settings', ['account_id'], unique=True)


def downgrade():
    op.drop_table('app_settings')
