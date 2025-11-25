from typing import List, Optional
from sqlalchemy import select, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.core.exceptions import http_400, http_404, http_403
from app.db.tables.dms.approvals import (
    ApprovalWorkflow, ApprovalStep, FolderApprovalRule, FolderApprovalRuleApprover,
    NotificationSettings, Notification,
    WorkflowMode, WorkflowStatus, StepStatus, NotificationMode, NotificationType
)
from app.db.tables.dms.files import FileNew
from app.db.tables.dms.folders_new import FolderNew
from app.db.tables.auth.auth import User
from app.schemas.dms.schemas import (
    ApprovalWorkflowCreate, ApprovalDecision,
    FolderApprovalRuleCreate, FolderApprovalRuleUpdate,
    NotificationSettingsCreate, NotificationSettingsUpdate
)


class ApprovalsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # ==================== APPROVAL WORKFLOWS ====================
    
    async def create_workflow(self, data: ApprovalWorkflowCreate, initiated_by: str) -> ApprovalWorkflow:
        """Create a new approval workflow"""
        # Verify file exists
        stmt = select(FileNew).where(FileNew.id == data.file_id)
        result = await self.session.execute(stmt)
        file = result.scalar_one_or_none()
        if not file:
            raise http_404(msg="File not found")
        
        # Create workflow
        workflow = ApprovalWorkflow(
            file_id=data.file_id,
            initiated_by=initiated_by,
            mode=WorkflowMode[data.mode],
            resolution_text=data.resolution_text,
            status=WorkflowStatus.pending
        )
        
        self.session.add(workflow)
        await self.session.flush()
        
        # Create approval steps
        for approver_data in data.approvers:
            step = ApprovalStep(
                workflow_id=workflow.id,
                approver_user_id=approver_data.approver_user_id,
                order_index=approver_data.order_index,
                status=StepStatus.pending
            )
            self.session.add(step)
        
        await self.session.commit()
        await self.session.refresh(workflow)
        
        # Create notifications for approvers
        await self._create_approval_notifications(workflow)
        
        return workflow
    
    async def get_workflow(self, workflow_id: str) -> Optional[ApprovalWorkflow]:
        """Get workflow by ID with steps"""
        stmt = select(ApprovalWorkflow).where(
            ApprovalWorkflow.id == workflow_id
        ).options(
            selectinload(ApprovalWorkflow.steps).selectinload(ApprovalStep.approver),
            selectinload(ApprovalWorkflow.file),
            selectinload(ApprovalWorkflow.initiator)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_workflows(self, file_id: Optional[str] = None, status: Optional[str] = None,
                           skip: int = 0, limit: int = 100) -> List[ApprovalWorkflow]:
        """List workflows with filters"""
        stmt = select(ApprovalWorkflow).options(
            selectinload(ApprovalWorkflow.steps).selectinload(ApprovalStep.approver),
            selectinload(ApprovalWorkflow.file),
            selectinload(ApprovalWorkflow.initiator)
        )
        
        conditions = []
        if file_id:
            conditions.append(ApprovalWorkflow.file_id == file_id)
        if status:
            conditions.append(ApprovalWorkflow.status == WorkflowStatus[status])
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(ApprovalWorkflow.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_my_pending_approvals(self, user_id: str, skip: int = 0, limit: int = 100) -> List[ApprovalStep]:
        """Get pending approval steps for a user"""
        stmt = select(ApprovalStep).where(
            ApprovalStep.approver_user_id == user_id,
            ApprovalStep.status == StepStatus.pending
        ).options(
            selectinload(ApprovalStep.workflow).selectinload(ApprovalWorkflow.file),
            selectinload(ApprovalStep.workflow).selectinload(ApprovalWorkflow.initiator),
            selectinload(ApprovalStep.approver)
        ).join(ApprovalWorkflow).where(
            ApprovalWorkflow.status == WorkflowStatus.pending
        ).order_by(ApprovalStep.created_at).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        steps = result.scalars().all()
        
        # Filter for serial workflows - only return if it's the user's turn
        filtered_steps = []
        for step in steps:
            if step.workflow.mode == WorkflowMode.parallel:
                filtered_steps.append(step)
            elif step.workflow.mode == WorkflowMode.serial:
                # Check if all previous steps are approved
                all_steps = sorted(step.workflow.steps, key=lambda s: s.order_index)
                can_approve = True
                for s in all_steps:
                    if s.order_index < step.order_index:
                        if s.status != StepStatus.approved:
                            can_approve = False
                            break
                    elif s.order_index == step.order_index:
                        break
                if can_approve:
                    filtered_steps.append(step)
        
        return filtered_steps
    
    async def make_decision(self, step_id: str, user_id: str, decision: ApprovalDecision) -> ApprovalStep:
        """Approve or reject an approval step"""
        # Get step with workflow
        stmt = select(ApprovalStep).where(ApprovalStep.id == step_id).options(
            selectinload(ApprovalStep.workflow).selectinload(ApprovalWorkflow.steps),
            selectinload(ApprovalStep.workflow).selectinload(ApprovalWorkflow.file),
            selectinload(ApprovalStep.workflow).selectinload(ApprovalWorkflow.initiator)
        )
        result = await self.session.execute(stmt)
        step = result.scalar_one_or_none()
        
        if not step:
            raise http_404(msg="Approval step not found")
        
        # Verify user is the approver
        if step.approver_user_id != user_id:
            raise http_403(msg="You are not authorized to approve this step")
        
        # Verify step is pending
        if step.status != StepStatus.pending:
            raise http_400(msg=f"Step is already {step.status.value}")
        
        # Verify workflow is pending
        if step.workflow.status != WorkflowStatus.pending:
            raise http_400(msg=f"Workflow is already {step.workflow.status.value}")
        
        # For serial workflows, verify it's the user's turn
        if step.workflow.mode == WorkflowMode.serial:
            all_steps = sorted(step.workflow.steps, key=lambda s: s.order_index)
            for s in all_steps:
                if s.order_index < step.order_index:
                    if s.status != StepStatus.approved:
                        raise http_400(msg="Previous approvers must approve first")
                elif s.order_index == step.order_index:
                    break
        
        # Update step
        step.status = StepStatus.approved if decision.decision == "approve" else StepStatus.rejected
        step.comment = decision.comment
        step.acted_at = datetime.utcnow()
        
        # Update workflow status
        await self._update_workflow_status(step.workflow)
        
        await self.session.commit()
        await self.session.refresh(step)
        
        # Create notifications
        await self._create_decision_notifications(step, decision.decision)
        
        return step
    
    async def _update_workflow_status(self, workflow: ApprovalWorkflow):
        """Update workflow status based on step statuses"""
        all_steps = workflow.steps
        
        # Check if any step is rejected
        if any(s.status == StepStatus.rejected for s in all_steps):
            workflow.status = WorkflowStatus.rejected
            workflow.completed_at = datetime.utcnow()
            # Mark remaining pending steps as skipped
            for step in all_steps:
                if step.status == StepStatus.pending:
                    step.status = StepStatus.skipped
            return
        
        # Check if all steps are approved
        if all(s.status == StepStatus.approved for s in all_steps):
            workflow.status = WorkflowStatus.approved
            workflow.completed_at = datetime.utcnow()
            return
        
        # Otherwise, workflow remains pending
        workflow.status = WorkflowStatus.pending
    
    async def cancel_workflow(self, workflow_id: str, user_id: str):
        """Cancel a workflow (only initiator can cancel)"""
        workflow = await self.get_workflow(workflow_id)
        if not workflow:
            raise http_404(msg="Workflow not found")
        
        if workflow.initiated_by != user_id:
            raise http_403(msg="Only the initiator can cancel the workflow")
        
        if workflow.status != WorkflowStatus.pending:
            raise http_400(msg=f"Cannot cancel workflow with status {workflow.status.value}")
        
        workflow.status = WorkflowStatus.cancelled
        workflow.completed_at = datetime.utcnow()
        
        # Mark all pending steps as skipped
        for step in workflow.steps:
            if step.status == StepStatus.pending:
                step.status = StepStatus.skipped
        
        await self.session.commit()
    
    # ==================== FOLDER APPROVAL RULES ====================
    
    async def create_folder_rule(self, data: FolderApprovalRuleCreate, created_by: str) -> FolderApprovalRule:
        """Create folder approval rule"""
        # Verify folder exists
        stmt = select(FolderNew).where(FolderNew.id == data.folder_id)
        result = await self.session.execute(stmt)
        folder = result.scalar_one_or_none()
        if not folder:
            raise http_404(msg="Folder not found")
        
        rule = FolderApprovalRule(
            folder_id=data.folder_id,
            mode=WorkflowMode[data.mode],
            resolution_text=data.resolution_text,
            apply_to_subfolders=data.apply_to_subfolders,
            is_active=data.is_active,
            created_by=created_by
        )
        
        self.session.add(rule)
        await self.session.flush()
        
        # Add approvers
        for approver_data in data.approvers:
            approver = FolderApprovalRuleApprover(
                rule_id=rule.id,
                user_id=approver_data.user_id,
                order_index=approver_data.order_index
            )
            self.session.add(approver)
        
        await self.session.commit()
        await self.session.refresh(rule)
        
        return rule
    
    async def get_folder_rule(self, rule_id: str) -> Optional[FolderApprovalRule]:
        """Get folder rule by ID"""
        stmt = select(FolderApprovalRule).where(
            FolderApprovalRule.id == rule_id
        ).options(
            selectinload(FolderApprovalRule.approvers),
            selectinload(FolderApprovalRule.folder)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_folder_rules(self, folder_id: Optional[str] = None, is_active: Optional[bool] = None,
                               skip: int = 0, limit: int = 100) -> List[FolderApprovalRule]:
        """List folder rules"""
        stmt = select(FolderApprovalRule).options(
            selectinload(FolderApprovalRule.approvers),
            selectinload(FolderApprovalRule.folder)
        )
        
        conditions = []
        if folder_id:
            conditions.append(FolderApprovalRule.folder_id == folder_id)
        if is_active is not None:
            conditions.append(FolderApprovalRule.is_active == is_active)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(FolderApprovalRule.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def update_folder_rule(self, rule_id: str, data: FolderApprovalRuleUpdate) -> FolderApprovalRule:
        """Update folder rule"""
        rule = await self.get_folder_rule(rule_id)
        if not rule:
            raise http_404(msg="Folder rule not found")
        
        # Update fields
        if data.mode:
            rule.mode = WorkflowMode[data.mode]
        if data.resolution_text is not None:
            rule.resolution_text = data.resolution_text
        if data.apply_to_subfolders is not None:
            rule.apply_to_subfolders = data.apply_to_subfolders
        if data.is_active is not None:
            rule.is_active = data.is_active
        
        # Update approvers if provided
        if data.approvers is not None:
            # Delete existing approvers
            for approver in rule.approvers:
                await self.session.delete(approver)
            await self.session.flush()
            
            # Add new approvers
            for approver_data in data.approvers:
                approver = FolderApprovalRuleApprover(
                    rule_id=rule.id,
                    user_id=approver_data.user_id,
                    order_index=approver_data.order_index
                )
                self.session.add(approver)
        
        await self.session.commit()
        await self.session.refresh(rule)
        
        return rule
    
    async def delete_folder_rule(self, rule_id: str):
        """Delete folder rule"""
        rule = await self.get_folder_rule(rule_id)
        if not rule:
            raise http_404(msg="Folder rule not found")
        
        await self.session.delete(rule)
        await self.session.commit()
    
    async def get_applicable_rule(self, folder_id: str) -> Optional[FolderApprovalRule]:
        """Get applicable rule for a folder (including parent folders if apply_to_subfolders is true)"""
        # Get folder with parent chain
        stmt = select(FolderNew).where(FolderNew.id == folder_id)
        result = await self.session.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if not folder:
            return None
        
        # Check current folder
        stmt = select(FolderApprovalRule).where(
            FolderApprovalRule.folder_id == folder_id,
            FolderApprovalRule.is_active == True
        ).options(selectinload(FolderApprovalRule.approvers))
        result = await self.session.execute(stmt)
        rule = result.scalar_one_or_none()
        
        if rule:
            return rule
        
        # Check parent folders with apply_to_subfolders
        current_folder = folder
        while current_folder.parent_folder_id:
            stmt = select(FolderApprovalRule).where(
                FolderApprovalRule.folder_id == current_folder.parent_folder_id,
                FolderApprovalRule.is_active == True,
                FolderApprovalRule.apply_to_subfolders == True
            ).options(selectinload(FolderApprovalRule.approvers))
            result = await self.session.execute(stmt)
            rule = result.scalar_one_or_none()
            
            if rule:
                return rule
            
            # Get parent folder
            stmt = select(FolderNew).where(FolderNew.id == current_folder.parent_folder_id)
            result = await self.session.execute(stmt)
            current_folder = result.scalar_one_or_none()
            
            if not current_folder:
                break
        
        return None
    
    async def auto_create_workflow_for_file(self, file_id: str, folder_id: str, initiated_by: str) -> Optional[ApprovalWorkflow]:
        """Auto-create workflow based on folder rules"""
        rule = await self.get_applicable_rule(folder_id)
        
        if not rule or not rule.approvers:
            return None
        
        # Create workflow
        workflow = ApprovalWorkflow(
            file_id=file_id,
            initiated_by=initiated_by,
            mode=rule.mode,
            resolution_text=rule.resolution_text or "Automatic approval required",
            status=WorkflowStatus.pending
        )
        
        self.session.add(workflow)
        await self.session.flush()
        
        # Create steps from rule approvers
        for approver in rule.approvers:
            step = ApprovalStep(
                workflow_id=workflow.id,
                approver_user_id=approver.user_id,
                order_index=approver.order_index,
                status=StepStatus.pending
            )
            self.session.add(step)
        
        await self.session.commit()
        await self.session.refresh(workflow)
        
        # Create notifications
        await self._create_approval_notifications(workflow)
        
        return workflow
    
    # ==================== NOTIFICATIONS ====================
    
    async def get_notification_settings(self, user_id: str, event_type: str = "approval") -> Optional[NotificationSettings]:
        """Get user notification settings"""
        stmt = select(NotificationSettings).where(
            NotificationSettings.user_id == user_id,
            NotificationSettings.event_type == event_type
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_or_update_notification_settings(self, user_id: str, data: NotificationSettingsCreate) -> NotificationSettings:
        """Create or update notification settings"""
        settings = await self.get_notification_settings(user_id, data.event_type)
        
        if settings:
            settings.mode = NotificationMode[data.mode]
            if data.group_interval:
                from app.db.tables.dms.approvals import GroupInterval
                settings.group_interval = GroupInterval[data.group_interval]
        else:
            from app.db.tables.dms.approvals import GroupInterval
            settings = NotificationSettings(
                user_id=user_id,
                event_type=data.event_type,
                mode=NotificationMode[data.mode],
                group_interval=GroupInterval[data.group_interval] if data.group_interval else None
            )
            self.session.add(settings)
        
        await self.session.commit()
        await self.session.refresh(settings)
        
        return settings
    
    async def create_notification(self, user_id: str, notification_type: NotificationType,
                                 title: str, message: str, related_entity_type: Optional[str] = None,
                                 related_entity_id: Optional[str] = None):
        """Create a notification"""
        # Check user's notification settings
        settings = await self.get_notification_settings(user_id, "approval")
        
        if settings and settings.mode == NotificationMode.off:
            return  # User has notifications disabled
        
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            is_read=False
        )
        
        self.session.add(notification)
        await self.session.commit()
    
    async def _create_approval_notifications(self, workflow: ApprovalWorkflow):
        """Create notifications when workflow is created"""
        for step in workflow.steps:
            # For serial workflows, only notify the first approver
            if workflow.mode == WorkflowMode.serial and step.order_index > 0:
                continue
            
            await self.create_notification(
                user_id=step.approver_user_id,
                notification_type=NotificationType.approval_assigned,
                title="New Approval Request",
                message=f"You have been assigned to approve: {workflow.file.name}",
                related_entity_type="workflow",
                related_entity_id=workflow.id
            )
    
    async def _create_decision_notifications(self, step: ApprovalStep, decision: str):
        """Create notifications when decision is made"""
        workflow = step.workflow
        
        # Notify initiator
        await self.create_notification(
            user_id=workflow.initiated_by,
            notification_type=NotificationType.approval_approved if decision == "approve" else NotificationType.approval_rejected,
            title=f"Approval {decision.title()}d",
            message=f"{step.approver.username} {decision}d: {workflow.file.name}",
            related_entity_type="workflow",
            related_entity_id=workflow.id
        )
        
        # If workflow is completed, notify all participants
        if workflow.status in [WorkflowStatus.approved, WorkflowStatus.rejected]:
            for s in workflow.steps:
                if s.approver_user_id != step.approver_user_id:
                    await self.create_notification(
                        user_id=s.approver_user_id,
                        notification_type=NotificationType.approval_completed,
                        title=f"Workflow {workflow.status.value.title()}",
                        message=f"Approval workflow for {workflow.file.name} is {workflow.status.value}",
                        related_entity_type="workflow",
                        related_entity_id=workflow.id
                    )
        
        # For serial workflows, notify next approver
        if workflow.mode == WorkflowMode.serial and decision == "approve" and workflow.status == WorkflowStatus.pending:
            all_steps = sorted(workflow.steps, key=lambda s: s.order_index)
            for next_step in all_steps:
                if next_step.order_index > step.order_index and next_step.status == StepStatus.pending:
                    await self.create_notification(
                        user_id=next_step.approver_user_id,
                        notification_type=NotificationType.approval_assigned,
                        title="Your Turn to Approve",
                        message=f"You can now approve: {workflow.file.name}",
                        related_entity_type="workflow",
                        related_entity_id=workflow.id
                    )
                    break
    
    async def list_notifications(self, user_id: str, is_read: Optional[bool] = None,
                                skip: int = 0, limit: int = 100) -> List[Notification]:
        """List user notifications"""
        stmt = select(Notification).where(Notification.user_id == user_id)
        
        if is_read is not None:
            stmt = stmt.where(Notification.is_read == is_read)
        
        stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def mark_notification_read(self, notification_id: str, user_id: str):
        """Mark notification as read"""
        stmt = select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id
        )
        result = await self.session.execute(stmt)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise http_404(msg="Notification not found")
        
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        
        await self.session.commit()
    
    async def mark_all_notifications_read(self, user_id: str):
        """Mark all notifications as read"""
        stmt = update(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).values(
            is_read=True,
            read_at=datetime.utcnow()
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications"""
        from sqlalchemy import func
        stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
