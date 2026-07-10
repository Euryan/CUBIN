from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.services.admin_service import list_categories, create_category, update_category, delete_category, create_reward, update_reward, delete_reward, authenticate_admin
from app.services.report_service import get_admin_statistics
from app.schemas.auth import AdminLoginRequest, AdminLoginResponse
from app.schemas.category import CategoryBase, CategoryResponse
from app.schemas.reward import RewardResponse, RewardCreateRequest, RewardUpdateRequest

admin_router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@admin_router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest):
    account = authenticate_admin(payload.email, payload.password)
    if not account:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return account


@admin_router.get("/categories", response_model=list[CategoryResponse])
async def category_list(db: AsyncSession = Depends(get_async_session)):
    return await list_categories(db)


@admin_router.post("/categories", response_model=CategoryResponse)
async def category_create(payload: CategoryBase, db: AsyncSession = Depends(get_async_session)):
    return await create_category(db, payload)


@admin_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def category_update(category_id: int, payload: CategoryBase, db: AsyncSession = Depends(get_async_session)):
    category = await update_category(db, category_id, payload)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@admin_router.delete("/categories/{category_id}")
async def category_delete(category_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_category(db, category_id)
    return {"detail": "Category deleted"}


@admin_router.post("/rewards", response_model=RewardResponse)
async def reward_create(payload: RewardCreateRequest, db: AsyncSession = Depends(get_async_session)):
    return await create_reward(db, payload.reward_name, payload.required_point, payload.stock, payload.image)


@admin_router.put("/rewards/{reward_id}", response_model=RewardResponse)
async def reward_update(reward_id: int, payload: RewardUpdateRequest, db: AsyncSession = Depends(get_async_session)):
    reward = await update_reward(db, reward_id, payload.reward_name, payload.required_point, payload.stock, payload.image)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    return reward


@admin_router.delete("/rewards/{reward_id}")
async def reward_delete(reward_id: int, db: AsyncSession = Depends(get_async_session)):
    await delete_reward(db, reward_id)
    return {"detail": "Reward deleted"}


@admin_router.get("/statistics")
async def admin_statistics(db: AsyncSession = Depends(get_async_session)):
    return await get_admin_statistics(db)
