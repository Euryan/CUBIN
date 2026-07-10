from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_async_session
from app.services.trash_service import get_category_by_name, create_trash_detection, get_trash_history, get_trash_summary, get_latest_detection
from app.services.user_service import get_user_by_rfid
from app.schemas.trash import TrashCreateRequest, TrashResponse, TrashSummary, HardwareDetectRequest
from app.models.trash import TrashDetectionLog
from app.models.user import User
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

trash_router = APIRouter(prefix="/api/v1/trash", tags=["trash"])

# Mapping class index dari AI model ke nama kategori di database
CATEGORY_MAP = {
    0: None,          # idle / background
    1: "Plastik",
    2: "Kaleng",
    3: "Kertas",
    4: "Kaca",
}

@trash_router.post("/detect", response_model=TrashResponse)
async def create_detection(payload: TrashCreateRequest, db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_rfid(db, payload.rfid_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    category = await get_category_by_name(db, payload.category)
    if not category:
        raise HTTPException(status_code=404, detail="Category not registered")
    return await create_trash_detection(db, user, category, payload.weight, payload.confidence_ai)


@trash_router.post("/detect-hardware")
async def detect_from_hardware(payload: HardwareDetectRequest, db: AsyncSession = Depends(get_async_session)):
    """
    Endpoint khusus untuk hardware (cobaconnect.py / Arduino).
    Menerima class_index dari AI model, bukan nama kategori.
    Jika rfid_uid diberikan, data melekat ke user tersebut.
    Jika tidak ada rfid_uid, data tetap tersimpan sebagai log anonim.
    """
    # Resolve category name from class index
    category_name = CATEGORY_MAP.get(payload.class_index)
    if category_name is None:
        raise HTTPException(status_code=400, detail=f"Class index {payload.class_index} is idle/background, not recorded")

    category = await get_category_by_name(db, category_name)
    if not category:
        raise HTTPException(status_code=404, detail=f"Category '{category_name}' not found in database. Please add it via admin panel.")

    # Get user by RFID if provided
    user = None
    if payload.rfid_uid:
        user = await get_user_by_rfid(db, payload.rfid_uid)

    # If no user, use a default system user (rfid_uid='hardware')
    if not user:
        result = await db.execute(select(User).where(User.rfid_uid == "hardware_system"))
        user = result.scalar_one_or_none()
        if not user:
            # Auto-create system user for hardware detections
            user = User(nama="Hardware System", rfid_uid="hardware_system")
            db.add(user)
            await db.flush()

    trash_log = await create_trash_detection(db, user, category, payload.weight, payload.confidence_ai)

    return {
        "success": True,
        "message": f"Deteksi {category_name} ({payload.weight} kg) berhasil disimpan",
        "trash_id": trash_log.id,
        "category": category_name,
        "weight": payload.weight,
        "points_earned": trash_log.point,
        "cash_earned": trash_log.price,
        "confidence_ai": payload.confidence_ai,
        "detected_at": trash_log.created_at.isoformat(),
        "user_rfid": payload.rfid_uid or "hardware_system",
    }


@trash_router.get("/history", response_model=list[TrashResponse])
async def trash_history(db: AsyncSession = Depends(get_async_session)):
    return await get_trash_history(db)


@trash_router.get("/summary", response_model=TrashSummary)
async def trash_summary(db: AsyncSession = Depends(get_async_session)):
    return await get_trash_summary(db)


@trash_router.get("/latest", response_model=TrashResponse)
async def latest_detection(db: AsyncSession = Depends(get_async_session)):
    latest = await get_latest_detection(db)
    if not latest:
        raise HTTPException(status_code=404, detail="No trash detection yet")
    return latest


@trash_router.get("/stats/realtime")
async def realtime_stats(db: AsyncSession = Depends(get_async_session)):
    """Admin dashboard real-time stats endpoint."""
    total_entries = await db.scalar(select(func.count(TrashDetectionLog.id)))
    total_weight = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)))
    total_points = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.point), 0)))
    total_users = await db.scalar(select(func.count(User.id)).where(User.rfid_uid != "hardware_system"))

    # Per category breakdown
    categories = ["Plastik", "Kaleng", "Kertas", "Kaca", "Elektronik", "Lainnya"]
    category_stats = {}
    for cat in categories:
        w = await db.scalar(
            select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == cat)
        )
        c = await db.scalar(
            select(func.count(TrashDetectionLog.id)).where(TrashDetectionLog.category == cat)
        )
        category_stats[cat] = {"weight": float(w or 0), "count": int(c or 0)}

    # Recent 10 logs
    recent_result = await db.execute(
        select(TrashDetectionLog, User.nama, User.rfid_uid)
        .join(User, TrashDetectionLog.user_id == User.id)
        .order_by(desc(TrashDetectionLog.created_at))
        .limit(20)
    )
    recent_logs = []
    for row in recent_result.all():
        log, nama, rfid = row
        recent_logs.append({
            "id": log.id,
            "user_name": nama,
            "rfid_uid": rfid,
            "category": log.category,
            "weight": log.weight,
            "point": log.point,
            "price": log.price,
            "confidence_ai": log.confidence_ai,
            "created_at": log.created_at.isoformat(),
        })

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_entries": int(total_entries or 0),
        "total_weight": float(total_weight or 0),
        "total_points": float(total_points or 0),
        "total_users": int(total_users or 0),
        "category_stats": category_stats,
        "recent_logs": recent_logs,
    }
