from fastapi import APIRouter, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies.auth_utils import get_current_user
from app.api.dependencies.repositories import get_repository, get_db
from app.schemas.auth.bands import UserOut, UserAuth, TokenData, AccountInfo
from app.db.repositories.auth.auth import AuthRepository
from app.db.tables.auth.auth import User

router = APIRouter(tags=["User Auth"])


@router.post(
    "/signup",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    name="signup",
    summary="Create new user",
)
async def signup(
    data: UserAuth, repository: AuthRepository = Depends(get_repository(AuthRepository))
):

    return await repository.signup(userdata=data)


@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    name="login",
    summary="Create access and refresh tokens for user",
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    repository: AuthRepository = Depends(get_repository(AuthRepository)),
):

    return await repository.login(ipdata=form_data)


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=TokenData,
    name="get_user_data",
    summary="Get details of currently logged in user",
)
async def get_me(
    user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch full user info with accounts from database
    stmt = select(User).options(selectinload(User.accounts)).where(User.id == user.id)
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()
    
    if db_user:
        return TokenData(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            is_active=db_user.is_active,
            default_account_id=db_user.default_account_id,
            accounts=[AccountInfo(id=acc.id, name=acc.name) for acc in db_user.accounts]
        )
    
    return user
