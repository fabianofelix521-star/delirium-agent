"""
JWT Authentication for Delirium Infinite.
Handles login, registration, and token management.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel


router = APIRouter()
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET", "delirium-dev-secret-change-me")
ALGORITHM = "HS256"
EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

# In-memory user store (replace with DB in production)
_users: dict[str, dict] = {}
_is_setup = False


class LoginRequest(BaseModel):
    password: str
    username: str = "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class SetupRequest(BaseModel):
    password: str
    username: str = "admin"


def create_token(username: str) -> str:
    """Create a JWT token."""
    expire = datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the username."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """Dependency to get the current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    username = verify_token(credentials.credentials)
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return username


@router.get("/status")
async def auth_status() -> dict:
    """Check if the system has been set up."""
    return {"is_setup": bool(_users), "requires_login": bool(_users)}


@router.post("/setup", response_model=TokenResponse)
async def setup(request: SetupRequest) -> TokenResponse:
    """First-time setup: create the master user."""
    if _users:
        raise HTTPException(status_code=400, detail="Setup already completed")
    hashed = pwd_context.hash(request.password)
    _users[request.username] = {"password_hash": hashed, "role": "admin"}
    token = create_token(request.username)
    return TokenResponse(access_token=token, expires_in=EXPIRY_HOURS * 3600)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """Login with username and password."""
    user = _users.get(request.username)
    if not user or not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(request.username)
    return TokenResponse(access_token=token, expires_in=EXPIRY_HOURS * 3600)


@router.get("/me")
async def get_me(username: str = Depends(get_current_user)) -> dict:
    """Get current user info."""
    return {"username": username, "role": "admin"}
