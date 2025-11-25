from fastapi import APIRouter, Depends, status, Header, Query
from typing import List, Optional

from app.api.dependencies.rbac import require_permission, get_current_user
from app.api.dependencies.repositories import get_repository
from app.db.repositories.dms.approvals_repository import ApprovalsRepository
from app.schemas.dms.schemas import (
    ApprovalWorkflowCreate, ApprovalWorkflowOut, ApprovalWorkflowDetail,
    ApprovalDecision, ApprovalStepDetail,
    FolderApprovalRuleCreate, FolderApprovalRuleUpdate, FolderApprovalRuleOut, FolderApprovalRuleDetail,
    NotificationSettingsCreate, NotificationSettingsUpdate, NotificationSettingsOut,
    NotificationOut, NotificationMarkRead
)
from app.schemas.auth.bands import TokenData

router = APIRouter(tags=["Approval Workflows"], prefix="/approvals")


# ==================== APPROVAL WORKFLOWS ====================

@router.post(
    "/workflows",
    response_model=ApprovalWorkflowOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("approvals", "create"))],
    summary="Create approval workflow"
)
async def create_workflow(
    data: ApprovalWorkflowCreate,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Create a new approval workflow for a file"""
    return await repository.create_workflow(data, current_user.id)


@router.get(
    "/workflows/{workflow_id}",
    response_model=ApprovalWorkflowDetail,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get workflow details"
)
async def get_workflow(
    workflow_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get workflow details with steps"""
    workflow = await repository.get_workflow(workflow_id)
    if not workflow:
        from app.core.exceptions import http_404
        raise http_404(msg="Workflow not found")
    
    # Build detailed response
    steps = []
    for step in workflow.steps:
        steps.append(ApprovalStepDetail(
            id=step.id,
            workflow_id=step.workflow_id,
            approver_user_id=step.approver_user_id,
            order_index=step.order_index,
            status=step.status.value,
            comment=step.comment,
            acted_at=step.acted_at,
            created_at=step.created_at,
            approver_username=step.approver.username,
            approver_email=step.approver.email
        ))
    
    return ApprovalWorkflowDetail(
        id=workflow.id,
        file_id=workflow.file_id,
        initiated_by=workflow.initiated_by,
        mode=workflow.mode.value,
        resolution_text=workflow.resolution_text,
        status=workflow.status.value,
        created_at=workflow.created_at,
        updated_at=workflow.updated_at,
        completed_at=workflow.completed_at,
        file_name=workflow.file.name,
        document_id=workflow.file.document_id,
        initiator_username=workflow.initiator.username,
        steps=steps
    )


@router.get(
    "/workflows",
    response_model=List[ApprovalWorkflowOut],
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="List workflows"
)
async def list_workflows(
    file_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, pattern=r'^(pending|approved|rejected|cancelled)$'),
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """List approval workflows with filters"""
    workflows = await repository.list_workflows(file_id, status, skip, limit)
    
    return [
        ApprovalWorkflowOut(
            id=w.id,
            file_id=w.file_id,
            initiated_by=w.initiated_by,
            mode=w.mode.value,
            resolution_text=w.resolution_text,
            status=w.status.value,
            created_at=w.created_at,
            updated_at=w.updated_at,
            completed_at=w.completed_at
        )
        for w in workflows
    ]


@router.get(
    "/my-approvals",
    response_model=List[ApprovalStepDetail],
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get my pending approvals"
)
async def get_my_approvals(
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get pending approval steps for current user"""
    steps = await repository.get_my_pending_approvals(current_user.id, skip, limit)
    
    result = []
    for step in steps:
        result.append(ApprovalStepDetail(
            id=step.id,
            workflow_id=step.workflow_id,
            approver_user_id=step.approver_user_id,
            order_index=step.order_index,
            status=step.status.value,
            comment=step.comment,
            acted_at=step.acted_at,
            created_at=step.created_at,
            approver_username=step.approver.username,
            approver_email=step.approver.email
        ))
    
    return result


@router.post(
    "/steps/{step_id}/decision",
    response_model=ApprovalStepDetail,
    dependencies=[Depends(require_permission("approvals", "approve"))],
    summary="Make approval decision"
)
async def make_decision(
    step_id: str,
    decision: ApprovalDecision,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Approve or reject an approval step"""
    step = await repository.make_decision(step_id, current_user.id, decision)
    
    return ApprovalStepDetail(
        id=step.id,
        workflow_id=step.workflow_id,
        approver_user_id=step.approver_user_id,
        order_index=step.order_index,
        status=step.status.value,
        comment=step.comment,
        acted_at=step.acted_at,
        created_at=step.created_at,
        approver_username=step.approver.username,
        approver_email=step.approver.email
    )


@router.delete(
    "/workflows/{workflow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("approvals", "create"))],
    summary="Cancel workflow"
)
async def cancel_workflow(
    workflow_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Cancel a pending workflow (initiator only)"""
    await repository.cancel_workflow(workflow_id, current_user.id)


# ==================== FOLDER APPROVAL RULES ====================

@router.post(
    "/folder-rules",
    response_model=FolderApprovalRuleOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("approvals", "admin"))],
    summary="Create folder approval rule"
)
async def create_folder_rule(
    data: FolderApprovalRuleCreate,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Create automated approval rule for a folder"""
    rule = await repository.create_folder_rule(data, current_user.id)
    
    return FolderApprovalRuleOut(
        id=rule.id,
        folder_id=rule.folder_id,
        mode=rule.mode.value,
        resolution_text=rule.resolution_text,
        apply_to_subfolders=rule.apply_to_subfolders,
        is_active=rule.is_active,
        created_by=rule.created_by,
        created_at=rule.created_at,
        updated_at=rule.updated_at
    )


@router.get(
    "/folder-rules/{rule_id}",
    response_model=FolderApprovalRuleDetail,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get folder rule details"
)
async def get_folder_rule(
    rule_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get folder approval rule details"""
    rule = await repository.get_folder_rule(rule_id)
    if not rule:
        from app.core.exceptions import http_404
        raise http_404(msg="Folder rule not found")
    
    from app.schemas.dms.schemas import FolderApprovalRuleApproverOut
    
    return FolderApprovalRuleDetail(
        id=rule.id,
        folder_id=rule.folder_id,
        mode=rule.mode.value,
        resolution_text=rule.resolution_text,
        apply_to_subfolders=rule.apply_to_subfolders,
        is_active=rule.is_active,
        created_by=rule.created_by,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        folder_name=rule.folder.name,
        approvers=[
            FolderApprovalRuleApproverOut(
                id=a.id,
                rule_id=a.rule_id,
                user_id=a.user_id,
                order_index=a.order_index
            )
            for a in rule.approvers
        ]
    )


@router.get(
    "/folder-rules",
    response_model=List[FolderApprovalRuleOut],
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="List folder rules"
)
async def list_folder_rules(
    folder_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """List folder approval rules"""
    rules = await repository.list_folder_rules(folder_id, is_active, skip, limit)
    
    return [
        FolderApprovalRuleOut(
            id=r.id,
            folder_id=r.folder_id,
            mode=r.mode.value,
            resolution_text=r.resolution_text,
            apply_to_subfolders=r.apply_to_subfolders,
            is_active=r.is_active,
            created_by=r.created_by,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in rules
    ]


@router.patch(
    "/folder-rules/{rule_id}",
    response_model=FolderApprovalRuleOut,
    dependencies=[Depends(require_permission("approvals", "admin"))],
    summary="Update folder rule"
)
async def update_folder_rule(
    rule_id: str,
    data: FolderApprovalRuleUpdate,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Update folder approval rule"""
    rule = await repository.update_folder_rule(rule_id, data)
    
    return FolderApprovalRuleOut(
        id=rule.id,
        folder_id=rule.folder_id,
        mode=rule.mode.value,
        resolution_text=rule.resolution_text,
        apply_to_subfolders=rule.apply_to_subfolders,
        is_active=rule.is_active,
        created_by=rule.created_by,
        created_at=rule.created_at,
        updated_at=rule.updated_at
    )


@router.delete(
    "/folder-rules/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("approvals", "admin"))],
    summary="Delete folder rule"
)
async def delete_folder_rule(
    rule_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Delete folder approval rule"""
    await repository.delete_folder_rule(rule_id)


# ==================== NOTIFICATIONS ====================

@router.get(
    "/notifications/me",
    response_model=List[NotificationOut],
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get my notifications"
)
async def get_my_notifications(
    is_read: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get notifications for current user"""
    notifications = await repository.list_notifications(current_user.id, is_read, skip, limit)
    
    return [
        NotificationOut(
            id=n.id,
            user_id=n.user_id,
            notification_type=n.notification_type.value,
            title=n.title,
            message=n.message,
            related_entity_type=n.related_entity_type,
            related_entity_id=n.related_entity_id,
            is_read=n.is_read,
            read_at=n.read_at,
            created_at=n.created_at
        )
        for n in notifications
    ]


@router.get(
    "/notifications/me/unread-count",
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get unread notification count"
)
async def get_unread_count(
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get count of unread notifications"""
    count = await repository.get_unread_count(current_user.id)
    return {"count": count}


@router.patch(
    "/notifications/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Mark notification as read"
)
async def mark_notification_read(
    notification_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Mark a notification as read"""
    await repository.mark_notification_read(notification_id, current_user.id)


@router.post(
    "/notifications/me/mark-all-read",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Mark all notifications as read"
)
async def mark_all_read(
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Mark all notifications as read"""
    await repository.mark_all_notifications_read(current_user.id)


@router.get(
    "/notifications/settings",
    response_model=NotificationSettingsOut,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Get notification settings"
)
async def get_notification_settings(
    event_type: str = Query("approval"),
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Get user notification settings"""
    settings = await repository.get_notification_settings(current_user.id, event_type)
    if not settings:
        from app.core.exceptions import http_404
        raise http_404(msg="Notification settings not found")
    
    return NotificationSettingsOut(
        id=settings.id,
        user_id=settings.user_id,
        event_type=settings.event_type,
        mode=settings.mode.value,
        group_interval=settings.group_interval.value if settings.group_interval else None,
        created_at=settings.created_at,
        updated_at=settings.updated_at
    )


@router.post(
    "/notifications/settings",
    response_model=NotificationSettingsOut,
    dependencies=[Depends(require_permission("approvals", "read"))],
    summary="Update notification settings"
)
async def update_notification_settings(
    data: NotificationSettingsCreate,
    current_user: TokenData = Depends(get_current_user),
    repository: ApprovalsRepository = Depends(get_repository(ApprovalsRepository))
):
    """Create or update notification settings"""
    settings = await repository.create_or_update_notification_settings(current_user.id, data)
    
    return NotificationSettingsOut(
        id=settings.id,
        user_id=settings.user_id,
        event_type=settings.event_type,
        mode=settings.mode.value,
        group_interval=settings.group_interval.value if settings.group_interval else None,
        created_at=settings.created_at,
        updated_at=settings.updated_at
    )
