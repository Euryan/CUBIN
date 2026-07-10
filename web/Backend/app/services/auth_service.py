from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.auth import RFIDLoginRequest


async def authenticate_rfid(db: AsyncSession, payload: RFIDLoginRequest) -> User | None:
    query = select(User).where(User.rfid_uid == payload.rfid_uid)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def register_user_profile(db: AsyncSession, user: User, username: str, email: str) -> UserProfile:
    profile = UserProfile(
        user_id=user.id,
        username=username.strip(),
        email=email.strip().lower(),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def authenticate_user_by_profile(db: AsyncSession, username: str, email: str) -> tuple[User | None, UserProfile | None]:
    query = select(UserProfile).where(
        UserProfile.username == username.strip(),
        UserProfile.email == email.strip().lower(),
    )
    result = await db.execute(query)
    profile = result.scalar_one_or_none()
    if not profile:
        return None, None

    user_result = await db.execute(select(User).where(User.id == profile.user_id))
    user = user_result.scalar_one_or_none()
    return user, profile


async def get_user_profile_by_user_id(db: AsyncSession, user_id: int) -> UserProfile | None:
    query = select(UserProfile).where(UserProfile.user_id == user_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def list_user_profiles_map(db: AsyncSession) -> dict[int, UserProfile]:
    result = await db.execute(select(UserProfile))
    profiles = result.scalars().all()
    return {profile.user_id: profile for profile in profiles}
