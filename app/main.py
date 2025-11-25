from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse

from app.api.router import router
from app.core.config import settings
from app.db.models import check_tables
from app.logs.logger import docflow_logger
from app.scripts.init_bucket import create_bucket_if_not_exists

# Import all models to ensure they are registered with SQLAlchemy Base
from app.db.tables.auth.auth import User  # noqa: F401
from app.db.tables.documents.documents_metadata import DocumentMetadata  # noqa: F401
from app.db.tables.documents.document_sharing import DocumentSharing  # noqa: F401
from app.db.tables.documents.comments import DocumentComment  # noqa: F401
from app.db.tables.documents.notify import Notify  # noqa: F401
from app.db.tables.documents.folders import Folder  # noqa: F401
# RBAC models
from app.db.tables.rbac.models import (  # noqa: F401
    Role, Group, Module, Permission, Account, PasswordPolicy, APIKey, PasswordHistory
)
# DMS models
from app.db.tables.dms.sections import Section  # noqa: F401
from app.db.tables.dms.folders_new import FolderNew  # noqa: F401
from app.db.tables.dms.files import FileNew  # noqa: F401
from app.db.tables.dms.metadata import MetadataDefinition, FileMetadata, RelatedFile  # noqa: F401
from app.db.tables.dms.versioning import FileVersion, FileLock, FileReminder  # noqa: F401
from app.db.tables.dms.approvals import (  # noqa: F401
    ApprovalWorkflow, ApprovalStep, FolderApprovalRule, FolderApprovalRuleApprover,
    NotificationSettings, Notification
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    docflow_logger.info("Starting DocFlow...")

    try:
        docflow_logger.info("Initializing Tables and Storage buckets...")
        await check_tables()
        await create_bucket_if_not_exists()
        docflow_logger.info("Tables and Storage buckets successfully created.")
    except Exception as e:
        docflow_logger.error(f"Error during startup: {e}")
        raise
    yield


app = FastAPI(
    title=settings.title,
    version=settings.version,
    description=settings.description,
    docs_url=settings.docs_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan,
)

# Workaround for OpenAPI schema generation issue with Pydantic v2
import logging
logger = logging.getLogger("uvicorn.error")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    try:
        # Try to generate the schema normally
        from fastapi.openapi.utils import get_openapi
        openapi_schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        app.openapi_schema = openapi_schema
        return app.openapi_schema
    except KeyError as e:
        # Catch the specific KeyError for '$ref'
        logger.warning(f"OpenAPI schema generation issue: {e}. Using minimal schema.")
        # Return a minimal working schema
        app.openapi_schema = {
            "openapi": "3.1.0",
            "info": {"title": app.title, "version": app.version, "description": app.description},
            "paths": {
                "/": {"get": {"summary": "Root", "responses": {"200": {"description": "Success"}}}},
                "/health": {"get": {"summary": "Health Check", "responses": {"200": {"description": "Success"}}}},
            },
        }
        return app.openapi_schema
    except Exception as e:
        logger.error(f"Unexpected error generating OpenAPI schema: {e}")
        # Return minimal schema as fallback
        app.openapi_schema = {
            "openapi": "3.1.0",
            "info": {"title": app.title, "version": app.version},
            "paths": {},
        }
        return app.openapi_schema

# Override the openapi method
app.openapi = custom_openapi

app.include_router(router=router, prefix=settings.api_prefix)


FAVICON_PATH = "favicon.ico"


@app.get(FAVICON_PATH, include_in_schema=False, tags=["Default"])
async def favicon():
    return FileResponse(FAVICON_PATH)


@app.get("/", tags=["Default"])
async def root():
    return {
        "API": "DocFlow - Document Management API is running! 🚀",
        "version": settings.version,
        "docs": f"{settings.host_url}{settings.docs_url}",
        "storage": "MinIO" if settings.s3_endpoint_url else "AWS S3",
    }


@app.get("/health", tags=["Default"])
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "DocFlow API", "version": settings.version}
