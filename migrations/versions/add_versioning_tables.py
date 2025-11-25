"""add versioning tables (file_versions, file_locks, file_reminders)

Revision ID: add_versioning_tables
Revises: add_metadata_tables
Create Date: 2025-11-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_versioning_tables'
down_revision = 'add_metadata_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns to files_new table
    op.add_column('files_new', sa.Column('document_id', sa.String(50), nullable=True, index=True))
    op.add_column('files_new', sa.Column('tags', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('files_new', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('files_new', sa.Column('current_version_id', sa.String(26), nullable=True))
    
    # Create unique constraint for document_id per account
    op.create_unique_constraint('uq_file_account_document_id', 'files_new', ['account_id', 'document_id'])
    
    # Create file_versions table
    op.create_table(
        'file_versions',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('file_id', sa.String(26), sa.ForeignKey('files_new.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.String(1000), nullable=False),
        sa.Column('mime_type', sa.String(200), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False, server_default='0'),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create file_locks table
    op.create_table(
        'file_locks',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('file_id', sa.String(26), sa.ForeignKey('files_new.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('locked_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('locked_until', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create file_reminders table
    op.create_table(
        'file_reminders',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('file_id', sa.String(26), sa.ForeignKey('files_new.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('created_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('target_user_id', sa.String(26), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('remind_at', sa.TIMESTAMP(timezone=True), nullable=False, index=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create indexes for better query performance
    op.create_index('idx_file_versions_file', 'file_versions', ['file_id', 'version_number'])
    op.create_index('idx_file_locks_until', 'file_locks', ['locked_until'])
    op.create_index('idx_file_reminders_due', 'file_reminders', ['target_user_id', 'status', 'remind_at'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_file_reminders_due', 'file_reminders')
    op.drop_index('idx_file_locks_until', 'file_locks')
    op.drop_index('idx_file_versions_file', 'file_versions')
    
    # Drop tables
    op.drop_table('file_reminders')
    op.drop_table('file_locks')
    op.drop_table('file_versions')
    
    # Drop constraint and columns from files_new
    op.drop_constraint('uq_file_account_document_id', 'files_new', type_='unique')
    op.drop_column('files_new', 'current_version_id')
    op.drop_column('files_new', 'notes')
    op.drop_column('files_new', 'tags')
    op.drop_column('files_new', 'document_id')
