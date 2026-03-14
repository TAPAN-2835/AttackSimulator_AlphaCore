from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import User, UserRole
from utils.security import decode_access_token
from database import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    # ── MOCK AUTH BYPASS FOR HACKATHON ───────────────────────────────────────
    try:
        if credentials and hasattr(credentials, 'credentials'):
            payload = decode_access_token(credentials.credentials)
            user_id: int | None = payload.get("sub")
            if user_id:
                result = await db.execute(select(User).where(User.id == int(user_id)))
                user = result.scalar_one_or_none()
                if user:
                    return user
    except Exception:
        pass
        
    # Fallback to injected default admin if auth fails
    return User(
        id=1,
        name="Anish Patel",
        email="anishpatel4y@gmail.com",
        role=UserRole.admin,
        department="IT"
    )


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    """Returns a dependency that enforces one of the given roles."""
    async def _check(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {[r.value for r in roles]}",
            )
        return user
    return _check


require_admin = require_role(UserRole.admin)
require_analyst = require_role(UserRole.admin, UserRole.analyst)
