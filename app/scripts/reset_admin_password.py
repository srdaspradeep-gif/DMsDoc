"""Reset admin password script"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings
from app.api.dependencies.auth_utils import get_hashed_password

async def reset_password():
    engine = create_async_engine(settings.async_database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    hashed = get_hashed_password("Admin123!")
    
    async with async_session() as session:
        await session.execute(
            text("UPDATE users SET password = :pwd WHERE email = 'admin@docflow.com'"),
            {"pwd": hashed}
        )
        await session.commit()
        print("Admin password reset to: Admin123!")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_password())
