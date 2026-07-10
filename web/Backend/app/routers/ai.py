from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.trash import TrashCreateRequest, TrashResponse
from app.database import get_async_session
from app.services.user_service import get_user_by_rfid
from app.services.trash_service import get_category_by_name, create_trash_detection

ai_router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


@ai_router.post("/detect", response_model=TrashResponse)
async def ai_detect(payload: TrashCreateRequest, db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_rfid(db, payload.rfid_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    category = await get_category_by_name(db, payload.category)
    if not category:
        raise HTTPException(status_code=404, detail="Category not registered")
    return await create_trash_detection(db, user, category, payload.weight, payload.confidence_ai)
