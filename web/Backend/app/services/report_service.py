from datetime import date
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.trash import TrashDetectionLog
from app.models.reward import Reward
from app.models.redeem import RewardRedemption


async def get_dashboard_summary(db: AsyncSession) -> dict:
    total_users = await db.scalar(select(func.count(User.id)))
    total_trash_collected = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)))
    total_plastic_recycled = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(TrashDetectionLog.category == "Plastic"))
    total_reward_distributed = await db.scalar(select(func.coalesce(func.sum(RewardRedemption.total_point), 0)))
    daily_statistics = await _get_daily_statistics(db)
    monthly_statistics = await _get_monthly_statistics(db)
    return {
        "total_users": int(total_users or 0),
        "total_trash_collected": float(total_trash_collected or 0.0),
        "total_plastic_recycled": float(total_plastic_recycled or 0.0),
        "total_reward_distributed": float(total_reward_distributed or 0.0),
        "daily_statistics": daily_statistics,
        "monthly_statistics": monthly_statistics,
    }


async def _get_daily_statistics(db: AsyncSession) -> dict:
    today = date.today()
    total_today = await db.scalar(
        select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(
            func.date(TrashDetectionLog.created_at) == today
        )
    )
    return {"date": today.isoformat(), "weight": float(total_today or 0.0)}


async def _get_monthly_statistics(db: AsyncSession) -> dict:
    today = date.today()
    month_total = await db.scalar(
        select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)).where(
            extract("year", TrashDetectionLog.created_at) == today.year,
            extract("month", TrashDetectionLog.created_at) == today.month,
        )
    )
    return {"year": today.year, "month": today.month, "weight": float(month_total or 0.0)}


async def get_admin_statistics(db: AsyncSession) -> dict:
    total_trash = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.weight), 0)))
    total_points = await db.scalar(select(func.coalesce(func.sum(TrashDetectionLog.point), 0)))
    total_rewards = await db.scalar(select(func.coalesce(func.count(Reward.id), 0)))
    total_redemptions = await db.scalar(select(func.coalesce(func.count(RewardRedemption.id), 0)))
    weekly_graph = []
    return {
        "total_trash": float(total_trash or 0.0),
        "total_points": float(total_points or 0.0),
        "total_rewards": int(total_rewards or 0),
        "total_redemptions": int(total_redemptions or 0),
        "weekly_graph": weekly_graph,
    }
