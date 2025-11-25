from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text
import enum

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class WorkflowMode(enum.Enum):
    """Workflow execution mode"""
    serial = "serial"  # Approvers must approve in order
    parallel = "parallel"  # All approvers can approve simultaneously


class WorkflowStatus(enum.Enum):
    """Workflow status"""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class ApprovalWorkflow(Base):
    """
    Approval workflows for files.
    Can be serial (sequential) or parallel (simultaneous).
    """
    __tablename__ = "approval_workflows"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    file_id = Column(String(26), ForeignKey("files_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    initiated_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    mode = Column(SQLEnum(WorkflowMode), nullable=False, default=WorkflowMode.parallel)
    resolution_text = Column(Text, nullable=True)  # Description of what needs approval
    status = Column(SQLEnum(WorkflowStatus), nullable=False, default=WorkflowStatus.pending, index=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    file = relationship("FileNew", foreign_keys=[file_id], backref="approval_workflows")
    initiator = relationship("User", foreign_keys=[initiated_by])
    steps = relationship("ApprovalStep", back_populates="workflow", cascade="all, delete-orphan", order_by="ApprovalStep.order_index")


class StepStatus(enum.Enum):
    """Approval step status"""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    skipped = "skipped"  # For serial workflows when earlier step rejected


class ApprovalStep(Base):
    """
    Individual approval steps within a workflow.
    In serial mode, order_index determines sequence.
    In parallel mode, all steps are active simultaneously.
    """
    __tablename__ = "approval_steps"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    workflow_id = Column(String(26), ForeignKey("approval_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    
    approver_user_id = Column(String(26), ForeignKey("users.id"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)  # For serial workflows
    
    status = Column(SQLEnum(StepStatus), nullable=False, default=StepStatus.pending, index=True)
    comment = Column(Text, nullable=True)
    
    acted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    workflow = relationship("ApprovalWorkflow", back_populates="steps")
    approver = relationship("User", foreign_keys=[approver_user_id])


class FolderApprovalRule(Base):
    """
    Automated approval rules for folders.
    When a file is uploaded to a folder with an active rule,
    an approval workflow is automatically created.
    """
    __tablename__ = "folder_approval_rules"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    folder_id = Column(String(26), ForeignKey("folders_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    mode = Column(SQLEnum(WorkflowMode), nullable=False, default=WorkflowMode.parallel)
    resolution_text = Column(Text, nullable=True)
    
    apply_to_subfolders = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    folder = relationship("FolderNew", foreign_keys=[folder_id], backref="approval_rules")
    creator = relationship("User", foreign_keys=[created_by])
    approvers = relationship("FolderApprovalRuleApprover", back_populates="rule", cascade="all, delete-orphan")


class FolderApprovalRuleApprover(Base):
    """
    Approvers for folder approval rules.
    Separate table for many-to-many relationship.
    """
    __tablename__ = "folder_approval_rule_approvers"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    rule_id = Column(String(26), ForeignKey("folder_approval_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(26), ForeignKey("users.id"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)  # For serial workflows

    # Relationships
    rule = relationship("FolderApprovalRule", back_populates="approvers")
    user = relationship("User")


class NotificationMode(enum.Enum):
    """Notification delivery mode"""
    instant = "instant"  # Send immediately
    grouped = "grouped"  # Group and send at intervals
    off = "off"  # Don't send


class GroupInterval(enum.Enum):
    """Grouping interval for notifications"""
    daily = "daily"
    weekly = "weekly"


class NotificationSettings(Base):
    """
    User notification preferences.
    Controls how and when users receive notifications.
    """
    __tablename__ = "notification_settings"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    event_type = Column(String(50), nullable=False, default="approval")  # approval, reminder, etc.
    mode = Column(SQLEnum(NotificationMode), nullable=False, default=NotificationMode.instant)
    group_interval = Column(SQLEnum(GroupInterval), nullable=True)  # Only for grouped mode
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


class NotificationType(enum.Enum):
    """Type of notification"""
    approval_assigned = "approval_assigned"  # You've been assigned to approve
    approval_approved = "approval_approved"  # Someone approved
    approval_rejected = "approval_rejected"  # Someone rejected
    approval_completed = "approval_completed"  # Workflow completed
    reminder_due = "reminder_due"  # Reminder is due


class Notification(Base):
    """
    Notifications for users.
    Created when approval events occur.
    """
    __tablename__ = "notifications"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    notification_type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Reference to related entity
    related_entity_type = Column(String(50), nullable=True)  # workflow, reminder, etc.
    related_entity_id = Column(String(26), nullable=True, index=True)
    
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
