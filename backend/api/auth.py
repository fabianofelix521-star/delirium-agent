"""
JWT Authentication for Delirium Infinite.
Single-user auth via environment variables.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel


router = APIRouter()
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.getenv("JWT_SECRET", "delirium-dev-secret-change-me")
ALGORITHM = "HS256"
EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

# Pre-configured admin user via env vars
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "fabianofelix21@gmail.com")
ADMIN_PASSWORD_HASH = os.getenv(
    "ADMIN_PASSWORD_HASH",
    "$2b$12$M5swDgvaIcnV1R6eZe965.fDpitJ75H7tegt4ZIh6lqyYgKfhR7ne",
)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def create_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS)
    payload = {"sub": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    email = verify_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return email


@router.get("/status")
async def auth_status() -> dict:
    return {"is_setup": True, "requires_login": True}


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    if request.email.lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(request.password.encode(), ADMIN_PASSWORD_HASH.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(request.email)
    return TokenResponse(access_token=token, expires_in=EXPIRY_HOURS * 3600)


@router.get("/me")
async def get_me(email: str = Depends(get_current_user)) -> dict:
    return {"email": email, "role": "admin"}
