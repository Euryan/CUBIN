from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trash import TrashDetectionLog
from app.models.user import User
from app.models.category import Category
from app.utils.point_calc import calculate_point


async def get_category_by_name(db: AsyncSession, category_name: str) -> Category | None:
    query = select(Category).where(func.lower(Category.name) == category_name.lower())
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_trash_detection(
    db: AsyncSession,
    user: User,
    category: Category,
    weight: float,
    confidence_ai: float,
) -> TrashDetectionLog:
    point = calculate_point(weight, category)
    trash = TrashDetectionLog(
        user_id=user.id,
        category=category.name,
        weight=weight,
        point=point,
        price=category.price,
        confidence_ai=confidence_ai,
    )
    db.add(trash)
    user.total_point = user.total_point + point
    await db.commit()
    await db.refresh(trash)
    await db.refresh(user)
    return trash


async def get_trash_history(db: AsyncSession, limit: int = 100) -> list[TrashDetectionLog]:
    result = await db.execute(select(TrashDetectionLog).order_by(desc(TrashDetectionLog.created_at)).limit(limit))
    return result.scalars().all()


async def get_latest_detection(db: AsyncSession) -> TrashDetectionLog | None:
    result = await db.execute(select(TrashDetectionLog).order_by(desc(TrashDetectionLog.created_at)).limit(1))
    return result.scalar_one_or_none()


async def get_trash_summary(db: AsyncSession) -> dict:
    total_entries = await db.scalar(select(func.count(TrashDetectionLog.id)))
    total_weight = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)))
    total_points = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.point), 0)))
    total_plastic = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == "Plastic"))
    total_organic = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == "Organic"))
    total_metal = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == "Metal"))
    total_paper = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == "Paper"))
    return {
        "total_entries": int(total_entries or 0),
        "total_weight": float(total_weight or 0.0),
        "total_points": float(total_points or 0.0),
        "total_plastic": float(total_plastic or 0.0),
        "total_organic": float(total_organic or 0.0),
        "total_metal": float(total_metal or 0.0),
        "total_paper": float(total_paper or 0.0),
    }
