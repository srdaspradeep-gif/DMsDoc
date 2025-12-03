from fastapi import APIRouter

from app.api.routes.auth.auth import router as auth_router
from app.api.routes.documents.documents_metadata import (
    router as documents_metadata_router,
)
from app.api.routes.documents.document import router as documents_router
from app.api.routes.documents.document_organization import (
    router as document_organization_router,
)
from app.api.routes.documents.document_sharing import router as document_sharing_router
from app.api.routes.documents.notify import router as notify_router
from app.api.routes.documents.comments import router as comments_router
from app.api.routes.documents.folders import router as folders_router

# RBAC routes
from app.api.routes.rbac.accounts import router as accounts_router
from app.api.routes.rbac.roles import router as roles_router
from app.api.routes.rbac.groups import router as groups_router
from app.api.routes.rbac.modules import router as modules_router
from app.api.routes.rbac.password_policy import router as password_policy_router
from app.api.routes.rbac.api_keys import router as api_keys_router
from app.api.routes.rbac.users import router as users_router

# DMS routes
from app.api.routes.dms.sections import router as sections_router
from app.api.routes.dms.folders_dms import router as folders_dms_router
from app.api.routes.dms.files_dms import router as files_dms_router
from app.api.routes.dms.metadata import router as metadata_router
from app.api.routes.dms.search import router as search_router
from app.api.routes.dms.versioning import router as versioning_router
from app.api.routes.dms.approvals import router as approvals_router
from app.api.routes.dms.sharing import router as sharing_router
from app.api.routes.dms.retention import router as retention_router
from app.api.routes.dms.inbox import router as inbox_router
from app.api.routes.dms.audit import router as audit_router
from app.api.routes.dms.access_overview import router as access_overview_router
from app.api.routes.dms.recycle_bin import router as recycle_bin_router
from app.api.routes.dms.reminders import router as reminders_router
from app.api.routes.dms.settings import router as settings_router

# Profile routes
from app.api.routes.rbac.profile import router as profile_router

router = APIRouter()

# Auth routes
router.include_router(auth_router, prefix="/u")

# Document routes (legacy)
router.include_router(documents_router, prefix="")
router.include_router(notify_router, prefix="/notifications")
router.include_router(documents_metadata_router, prefix="/metadata")
router.include_router(document_organization_router, prefix="/filter")
router.include_router(document_sharing_router)
router.include_router(comments_router, prefix="/documents")
router.include_router(folders_router, prefix="/folders")

# RBAC routes
router.include_router(accounts_router, prefix="/rbac")
router.include_router(roles_router, prefix="/rbac")
router.include_router(groups_router, prefix="/rbac")
router.include_router(modules_router, prefix="/rbac")
router.include_router(password_policy_router, prefix="/rbac")
router.include_router(api_keys_router, prefix="/rbac")
router.include_router(users_router, prefix="/rbac")

# DMS routes (new)
router.include_router(sections_router, prefix="/dms")
router.include_router(folders_dms_router, prefix="/dms")
router.include_router(files_dms_router, prefix="/dms")
router.include_router(metadata_router, prefix="/dms")
router.include_router(search_router, prefix="/dms")
router.include_router(versioning_router, prefix="/dms")
router.include_router(approvals_router, prefix="/dms")
router.include_router(sharing_router, prefix="/dms")
router.include_router(retention_router, prefix="/dms")
router.include_router(inbox_router, prefix="/dms")
router.include_router(audit_router, prefix="/dms")
router.include_router(access_overview_router, prefix="/dms")
router.include_router(recycle_bin_router, prefix="/dms")
router.include_router(reminders_router, prefix="/dms")
router.include_router(settings_router, prefix="/dms")

# Profile routes
router.include_router(profile_router, prefix="/rbac")
