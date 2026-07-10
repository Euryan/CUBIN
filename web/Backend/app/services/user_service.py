from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.trash import TrashDetectionLog
from app.schemas.user import UserHistoryItem


async def get_all_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


async def get_user_by_rfid(db: AsyncSession, rfid_uid: str) -> User | None:
    query = select(User).where(User.rfid_uid == rfid_uid)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_leaderboard(db: AsyncSession, limit: int = 20) -> list[User]:
    result = await db.execute(select(User).order_by(desc(User.total_point)).limit(limit))
    return result.scalars().all()


async def get_user_history(db: AsyncSession, user_id: int) -> list[UserHistoryItem]:
    query = select(TrashDetectionLog).where(TrashDetectionLog.user_id == user_id).order_by(TrashDetectionLog.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


async def create_user(db: AsyncSession, nama: str, rfid_uid: str) -> User:
    new_user = User(nama=nama, rfid_uid=rfid_uid)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


async def update_user_rfid(db: AsyncSession, user_id: int, rfid_uid: str) -> User | None:
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        return None

    user.rfid_uid = rfid_uid
    await db.commit()
    await db.refresh(user)
    return user
