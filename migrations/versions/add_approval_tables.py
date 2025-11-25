"""add approval tables (workflows, steps, rules, notifications)

Revision ID: add_approval_tables
Revises: add_versioning_tables
Create Date: 2025-11-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_approval_tables'
down_revision = 'add_versioning_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create approval_workflows table
    op.create_table(
        'approval_workflows',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('file_id', sa.String(26), sa.ForeignKey('files_new.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('initiated_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('mode', sa.String(20), nullable=False, server_default='parallel'),
        sa.Column('resolution_text', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('completed_at', sa.TIMESTAMP(timezone=True), nullable=True),
    )
    
    # Create approval_steps table
    op.create_table(
        'approval_steps',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('workflow_id', sa.String(26), sa.ForeignKey('approval_workflows.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('approver_user_id', sa.String(26), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending', index=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('acted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create folder_approval_rules table
    op.create_table(
        'folder_approval_rules',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('folder_id', sa.String(26), sa.ForeignKey('folders_new.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('mode', sa.String(20), nullable=False, server_default='parallel'),
        sa.Column('resolution_text', sa.Text(), nullable=True),
        sa.Column('apply_to_subfolders', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', index=True),
        sa.Column('created_by', sa.String(26), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create folder_approval_rule_approvers table
    op.create_table(
        'folder_approval_rule_approvers',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('rule_id', sa.String(26), sa.ForeignKey('folder_approval_rules.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', sa.String(26), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
    )
    
    # Create notification_settings table
    op.create_table(
        'notification_settings',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('user_id', sa.String(26), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('event_type', sa.String(50), nullable=False, server_default='approval'),
        sa.Column('mode', sa.String(20), nullable=False, server_default='instant'),
        sa.Column('group_interval', sa.String(20), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(26), primary_key=True, nullable=False),
        sa.Column('user_id', sa.String(26), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('notification_type', sa.String(50), nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('related_entity_type', sa.String(50), nullable=True),
        sa.Column('related_entity_id', sa.String(26), nullable=True, index=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false', index=True),
        sa.Column('read_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()'), index=True),
    )
    
    # Create indexes for better query performance
    op.create_index('idx_workflows_file_status', 'approval_workflows', ['file_id', 'status'])
    op.create_index('idx_steps_workflow_order', 'approval_steps', ['workflow_id', 'order_index'])
    op.create_index('idx_steps_approver_status', 'approval_steps', ['approver_user_id', 'status'])
    op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'is_read', 'created_at'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_notifications_user_read', 'notifications')
    op.drop_index('idx_steps_approver_status', 'approval_steps')
    op.drop_index('idx_steps_workflow_order', 'approval_steps')
    op.drop_index('idx_workflows_file_status', 'approval_workflows')
    
    # Drop tables
    op.drop_table('notifications')
    op.drop_table('notification_settings')
    op.drop_table('folder_approval_rule_approvers')
    op.drop_table('folder_approval_rules')
    op.drop_table('approval_steps')
    op.drop_table('approval_workflows')
