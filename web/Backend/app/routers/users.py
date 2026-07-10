from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models.user import User
from app.services.auth_service import get_user_profile_by_user_id, list_user_profiles_map
from app.services.user_service import get_all_users, get_user_by_rfid, get_leaderboard, get_user_history
from app.services.user_service import create_user, update_user_rfid
from sqlalchemy.exc import IntegrityError
from app.schemas.user import UserResponse, UserLeaderboard, UserHistoryResponse, UserBase, UserRFIDUpdateRequest

user_router = APIRouter(prefix="/api/v1/users", tags=["users"])


def normalize_user(user: User) -> User:
    if user.total_point is None:
        user.total_point = 0.0
    if user.saldo_reward is None:
        user.saldo_reward = 0.0
    if user.created_at is None:
        from datetime import datetime
        user.created_at = datetime.utcnow()
    return user


@user_router.get("/", response_model=list[UserResponse])
async def list_users(db: AsyncSession = Depends(get_async_session)):
    users = await get_all_users(db)
    profile_map = await list_user_profiles_map(db)

    payloads = []
    for user in users:
        normalized = normalize_user(user)
        profile = profile_map.get(normalized.id)
        payloads.append({
            "id": normalized.id,
            "nama": normalized.nama,
            "rfid_uid": normalized.rfid_uid,
            "username": profile.username if profile else None,
            "email": profile.email if profile else None,
            "total_point": normalized.total_point,
            "saldo_reward": normalized.saldo_reward,
            "created_at": normalized.created_at,
        })

    return payloads


@user_router.get("/rfid/{rfid_uid}", response_model=UserResponse)
async def get_user_by_rfid_endpoint(rfid_uid: str, db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_rfid(db, rfid_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    normalized = normalize_user(user)
    profile = await get_user_profile_by_user_id(db, normalized.id)
    return {
        "id": normalized.id,
        "nama": normalized.nama,
        "rfid_uid": normalized.rfid_uid,
        "username": profile.username if profile else None,
        "email": profile.email if profile else None,
        "total_point": normalized.total_point,
        "saldo_reward": normalized.saldo_reward,
        "created_at": normalized.created_at,
    }


@user_router.get("/leaderboard", response_model=list[UserLeaderboard])
async def leaderboard(limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_async_session)):
    return await get_leaderboard(db, limit)


@user_router.get("/{user_id}/history", response_model=UserHistoryResponse)
async def get_user_history_endpoint(user_id: int, db: AsyncSession = Depends(get_async_session)):
    query = await db.execute(select(User).where(User.id == user_id))
    user_obj = query.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
    history = await get_user_history(db, user_id)
    return {"user": user_obj, "history": history}


@user_router.post("/", response_model=UserResponse, status_code=201)
async def register_user(payload: UserBase, db: AsyncSession = Depends(get_async_session)):
    try:
        user = await create_user(db, payload.nama, payload.rfid_uid)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="RFID UID already registered")
    return user


@user_router.patch("/{user_id}/rfid", response_model=UserResponse)
async def set_user_rfid(user_id: int, payload: UserRFIDUpdateRequest, db: AsyncSession = Depends(get_async_session)):
    try:
        user = await update_user_rfid(db, user_id, payload.rfid_uid)
    except IntegrityError:
        raise HTTPException(status_code=400, detail="RFID UID already registered")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized = normalize_user(user)
    profile = await get_user_profile_by_user_id(db, normalized.id)
    return {
        "id": normalized.id,
        "nama": normalized.nama,
        "rfid_uid": normalized.rfid_uid,
        "username": profile.username if profile else None,
        "email": profile.email if profile else None,
        "total_point": normalized.total_point,
        "saldo_reward": normalized.saldo_reward,
        "created_at": normalized.created_at,
    }
