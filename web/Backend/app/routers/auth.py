from fastapi import APIRouter, Depends, HTTPException, status
from uuid import uuid4
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth import RFIDLoginRequest, RFIDLoginResponse, UserRegisterRequest, UserLoginRequest, UserLoginResponse
from app.database import get_async_session
from app.services.auth_service import authenticate_rfid, register_user_profile, authenticate_user_by_profile
from app.services.user_service import create_user

auth_router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@auth_router.post("/login", response_model=RFIDLoginResponse)
async def login_rfid(payload: RFIDLoginRequest, db: AsyncSession = Depends(get_async_session)):
    user = await authenticate_rfid(db, payload)
    if not user:
        try:
            user = await create_user(db, nama=f"User {payload.rfid_uid}", rfid_uid=payload.rfid_uid)
        except IntegrityError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="RFID UID already registered")
    return user


@auth_router.post("/register", response_model=UserLoginResponse)
async def register_user_with_profile(payload: UserRegisterRequest, db: AsyncSession = Depends(get_async_session)):
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not username or not email:
        raise HTTPException(status_code=400, detail="Username and email are required")

    placeholder_rfid = f"pending_{uuid4().hex[:12]}"

    user = None
    try:
        user = await create_user(db, username, placeholder_rfid)
        profile = await register_user_profile(db, user, username, email)
    except IntegrityError:
        if user is not None:
            await db.delete(user)
            await db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already registered")

    return {
        "id": user.id,
        "nama": user.nama,
        "rfid_uid": user.rfid_uid,
        "username": profile.username,
        "email": profile.email,
        "total_point": user.total_point or 0.0,
        "saldo_reward": user.saldo_reward or 0.0,
    }


@auth_router.post("/login-user", response_model=UserLoginResponse)
async def login_user_with_profile(payload: UserLoginRequest, db: AsyncSession = Depends(get_async_session)):
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not username or not email:
        raise HTTPException(status_code=400, detail="Username and email are required")

    user, profile = await authenticate_user_by_profile(db, username, email)
    if not user or not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "id": user.id,
        "nama": user.nama,
        "rfid_uid": user.rfid_uid,
        "username": profile.username,
        "email": profile.email,
        "total_point": user.total_point or 0.0,
        "saldo_reward": user.saldo_reward or 0.0,
    }
