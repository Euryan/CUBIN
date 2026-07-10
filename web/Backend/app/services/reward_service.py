from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.reward import Reward
from app.models.user import User
from app.models.redeem import RewardRedemption
from app.schemas.reward import RedeemRequest


async def list_rewards(db: AsyncSession) -> list[Reward]:
    result = await db.execute(select(Reward).order_by(Reward.required_point.asc()))
    return result.scalars().all()


async def get_reward_by_id(db: AsyncSession, reward_id: int) -> Reward | None:
    result = await db.execute(select(Reward).where(Reward.id == reward_id))
    return result.scalar_one_or_none()


async def redeem_reward(db: AsyncSession, user: User, reward: Reward, quantity: int = 1) -> RewardRedemption:
    total_cost = reward.required_point * quantity
    if user.total_point < total_cost:
        raise ValueError("Insufficient points to redeem reward")
    if reward.stock < quantity:
        raise ValueError("Reward stock is not sufficient")

    reward.stock -= quantity
    user.total_point -= total_cost
    user.saldo_reward += total_cost

    redemption = RewardRedemption(
        user_id=user.id,
        reward_id=reward.id,
        quantity=quantity,
        total_point=total_cost,
        status="completed",
    )
    db.add(redemption)
    await db.commit()
    await db.refresh(redemption)
    await db.refresh(user)
    return redemption


async def get_redeem_history(db: AsyncSession, user_id: int) -> list[RewardRedemption]:
    result = await db.execute(
        select(RewardRedemption)
        .options(selectinload(RewardRedemption.reward))
        .where(RewardRedemption.user_id == user_id)
        .order_by(desc(RewardRedemption.redeemed_at))
    )
    return result.scalars().all()
