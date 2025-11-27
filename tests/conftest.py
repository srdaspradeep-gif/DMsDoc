import sys

# Fix: Remove /usr/src from path - it causes pytest to find wrong 'app' package
sys.path = [p for p in sys.path if p != "/usr/src"]

import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text

from app.main import app
from app.db.models import Base
from app.core.config import settings
from app.api.dependencies.repositories import get_db


# Use the main database for tests (not a separate test database)
# This avoids the need to create a separate test_docflow database
DATABASE_URL = settings.async_database_url


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )
    yield engine
    await engine.dispose()


@pytest.fixture(scope="session")
async def test_session_factory(test_engine):
    """Create async session factory."""
    return async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


@pytest.fixture
async def test_session(test_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session with transaction rollback."""
    async with test_session_factory() as session:
        yield session
        await session.rollback()


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override database dependency for tests."""
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
    )
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create test client with overridden database dependency."""
    # Override the database dependency
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Clear overrides after test
    app.dependency_overrides.clear()


@pytest.fixture
async def clean_db(test_session: AsyncSession):
    """Clean up test data before each test."""
    # Delete in correct order to respect foreign keys
    tables_to_clean = [
        "file_reminders",
        "file_locks",
        "file_versions",
        "file_metadata",
        "related_files",
        "metadata_definitions",
        "files_new",
        "folders_new",
        "sections",
        "notifications",
        "notification_settings",
        "folder_approval_rule_approvers",
        "folder_approval_rules",
        "approval_steps",
        "approval_workflows",
        "api_keys",
        "password_history",
        "permissions",
        "user_groups",
        "user_roles",
        "user_accounts",
        "roles",
        "groups",
        "accounts",
        "password_policies",
        "modules",
        "users",
    ]

    for table in tables_to_clean:
        try:
            await test_session.execute(text(f"DELETE FROM {table}"))
        except Exception:
            pass  # Table might not exist

    await test_session.commit()
