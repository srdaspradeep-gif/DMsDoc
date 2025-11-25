"""add step7 tables for sharing, retention, inbox, audit

Revision ID: add_step7_tables
Revises: add_approval_tables
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_step7_tables'
down_revision = 'add_approval_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Add inbox_address to accounts table
    op.add_column('accounts', sa.Column('inbox_address', sa.String(200), nullable=True))
    op.create_index('ix_accounts_inbox_address', 'accounts', ['inbox_address'], unique=True)
    
    # Add profile fields to users table
    op.add_column('users', sa.Column('language', sa.String(10), nullable=True, server_default='en'))
    op.add_column('users', sa.Column('timezone', sa.String(50), nullable=True, server_default='UTC'))
    op.add_column('users', sa.Column('default_account_id', sa.String(26), nullable=True))
    op.create_foreign_key('fk_users_default_account', 'users', 'accounts', ['default_account_id'], ['id'], ondelete='SET NULL')
    
    # Add notification_preferences to account_users table
    op.add_column('account_users', sa.Column('notification_preferences', sa.Text, nullable=True))
    
    # Add deleted_at to files_new table (if not exists)
    # Note: is_deleted already exists, just ensure deleted_at is there
    # Check if column exists first in production
    
    # Create shares table
    op.create_table(
        'shares',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('account_id', sa.String(26), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.Enum('FILE', 'FOLDER', 'SECTION', 'ACCOUNT', name='resourcetype'), nullable=False),
        sa.Column('resource_id', sa.String(26), nullable=False),
        sa.Column('target_type', sa.Enum('USER', 'GROUP', 'PUBLIC_LINK', name='targettype'), nullable=False),
        sa.Column('target_id', sa.String(26), nullable=True),
        sa.Column('access_level', sa.Enum('PREVIEW', 'VIEW', 'EDIT', name='accesslevel'), nullable=False, server_default='VIEW'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('public_token', sa.String(64), nullable=True),
        sa.Column('created_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_shares_id', 'shares', ['id'], unique=True)
    op.create_index('ix_shares_account_id', 'shares', ['account_id'])
    op.create_index('ix_shares_resource_type', 'shares', ['resource_type'])
    op.create_index('ix_shares_resource_id', 'shares', ['resource_id'])
    op.create_index('ix_shares_target_type', 'shares', ['target_type'])
    op.create_index('ix_shares_target_id', 'shares', ['target_id'])
    op.create_index('ix_shares_public_token', 'shares', ['public_token'], unique=True)
    op.create_index('idx_share_resource', 'shares', ['resource_type', 'resource_id'])
    op.create_index('idx_share_target', 'shares', ['target_type', 'target_id'])
    
    # Create retention_policies table
    op.create_table(
        'retention_policies',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('account_id', sa.String(26), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('folder_id', sa.String(26), sa.ForeignKey('folders_new.id', ondelete='CASCADE'), nullable=False),
        sa.Column('apply_to_subfolders', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('retention_days', sa.Integer, nullable=False),
        sa.Column('mode', sa.Enum('MOVE_TO_RECYCLE', 'DELETE', name='retentionmode'), nullable=False, server_default='MOVE_TO_RECYCLE'),
        sa.Column('created_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_retention_policies_id', 'retention_policies', ['id'], unique=True)
    op.create_index('ix_retention_policies_account_id', 'retention_policies', ['account_id'])
    op.create_index('ix_retention_policies_folder_id', 'retention_policies', ['folder_id'])
    
    # Create inbox_entries table
    op.create_table(
        'inbox_entries',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('account_id', sa.String(26), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('from_email', sa.String(500), nullable=False),
        sa.Column('subject', sa.String(1000), nullable=True),
        sa.Column('body_preview', sa.Text, nullable=True),
        sa.Column('folder_id', sa.String(26), sa.ForeignKey('folders_new.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_processed', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_by', sa.String(26), sa.ForeignKey('users.id'), nullable=True)
    )
    op.create_index('ix_inbox_entries_id', 'inbox_entries', ['id'], unique=True)
    op.create_index('ix_inbox_entries_account_id', 'inbox_entries', ['account_id'])
    op.create_index('ix_inbox_entries_folder_id', 'inbox_entries', ['folder_id'])
    
    # Create inbox_attachments table
    op.create_table(
        'inbox_attachments',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('inbox_entry_id', sa.String(26), sa.ForeignKey('inbox_entries.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('mime_type', sa.String(200), nullable=True),
        sa.Column('size_bytes', sa.String(20), nullable=False),
        sa.Column('storage_path', sa.String(1000), nullable=False),
        sa.Column('file_id', sa.String(26), sa.ForeignKey('files_new.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_inbox_attachments_id', 'inbox_attachments', ['id'], unique=True)
    op.create_index('ix_inbox_attachments_inbox_entry_id', 'inbox_attachments', ['inbox_entry_id'])
    
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('account_id', sa.String(26), sa.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(26), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('api_key_id', sa.String(26), sa.ForeignKey('api_keys.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(26), nullable=True),
        sa.Column('metadata', postgresql.JSON, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'], unique=True)
    op.create_index('ix_audit_logs_account_id', 'audit_logs', ['account_id'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_api_key_id', 'audit_logs', ['api_key_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_resource_type', 'audit_logs', ['resource_type'])
    op.create_index('ix_audit_logs_resource_id', 'audit_logs', ['resource_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_account_action', 'audit_logs', ['account_id', 'action'])
    op.create_index('idx_audit_resource', 'audit_logs', ['resource_type', 'resource_id'])


def downgrade():
    # Drop tables in reverse order
    op.drop_table('audit_logs')
    op.drop_table('inbox_attachments')
    op.drop_table('inbox_entries')
    op.drop_table('retention_policies')
    op.drop_table('shares')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS resourcetype')
    op.execute('DROP TYPE IF EXISTS targettype')
    op.execute('DROP TYPE IF EXISTS accesslevel')
    op.execute('DROP TYPE IF EXISTS retentionmode')
    
    # Remove columns from existing tables
    op.drop_column('account_users', 'notification_preferences')
    op.drop_constraint('fk_users_default_account', 'users', type_='foreignkey')
    op.drop_column('users', 'default_account_id')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'language')
    op.drop_index('ix_accounts_inbox_address', 'accounts')
    op.drop_column('accounts', 'inbox_address')
