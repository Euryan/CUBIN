from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.services.reward_service import list_rewards, get_reward_by_id, redeem_reward, get_redeem_history
from app.services.user_service import get_user_by_rfid
from app.schemas.reward import RewardResponse, RedeemRequest, RedeemHistoryItem

reward_router = APIRouter(prefix="/api/v1/rewards", tags=["rewards"])


def serialize_redemption(redemption, user=None):
    return {
        "id": redemption.id,
        "reward_id": redemption.reward_id,
        "reward_name": redemption.reward.reward_name if getattr(redemption, "reward", None) else None,
        "quantity": redemption.quantity,
        "total_point": redemption.total_point,
        "status": redemption.status,
        "redeemed_at": redemption.redeemed_at,
        "remaining_points": float(user.total_point) if user is not None else None,
        "remaining_balance": float(user.saldo_reward) if user is not None else None,
    }


@reward_router.get("/", response_model=list[RewardResponse])
async def get_rewards(db: AsyncSession = Depends(get_async_session)):
    return await list_rewards(db)


@reward_router.post("/redeem", response_model=RedeemHistoryItem)
async def redeem(payload: RedeemRequest, db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_rfid(db, payload.rfid_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    reward = await get_reward_by_id(db, payload.reward_id)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    try:
        redemption = await redeem_reward(db, user, reward, payload.quantity)
        redemption.reward = reward
        return serialize_redemption(redemption, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@reward_router.get("/history/{rfid_uid}", response_model=list[RedeemHistoryItem])
async def redemption_history(rfid_uid: str, db: AsyncSession = Depends(get_async_session)):
    user = await get_user_by_rfid(db, rfid_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    history = await get_redeem_history(db, user.id)
    return [serialize_redemption(item) for item in history]
