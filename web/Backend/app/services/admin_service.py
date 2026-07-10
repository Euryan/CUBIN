from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.models.category import Category
from app.models.reward import Reward
from app.schemas.category import CategoryBase


def authenticate_admin(email: str, password: str) -> dict | None:
    normalized_email = (email or "").strip().lower()
    if normalized_email != settings.ADMIN_EMAIL.strip().lower():
        return None
    if password != settings.ADMIN_PASSWORD:
        return None

    return {
        "name": settings.ADMIN_NAME,
        "email": settings.ADMIN_EMAIL,
        "role": settings.ADMIN_ROLE,
        "source": "backend",
    }


async def list_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.name.asc()))
    return result.scalars().all()


async def create_category(db: AsyncSession, payload: CategoryBase) -> Category:
    category = Category(name=payload.name, price=payload.price, description=payload.description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category_id: int, payload: CategoryBase) -> Category | None:
    query = select(Category).where(Category.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    if category is None:
        return None
    category.name = payload.name
    category.price = payload.price
    category.description = payload.description
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category_id: int) -> None:
    await db.execute(delete(Category).where(Category.id == category_id))
    await db.commit()


async def create_reward(db: AsyncSession, reward_name: str, required_point: float, stock: int, image: str | None = None) -> Reward:
    reward = Reward(reward_name=reward_name, required_point=required_point, stock=stock, image=image)
    db.add(reward)
    await db.commit()
    await db.refresh(reward)
    return reward


async def update_reward(db: AsyncSession, reward_id: int, reward_name: str, required_point: float, stock: int, image: str | None = None) -> Reward | None:
    query = select(Reward).where(Reward.id == reward_id)
    result = await db.execute(query)
    reward = result.scalar_one_or_none()
    if reward is None:
        return None
    reward.reward_name = reward_name
    reward.required_point = required_point
    reward.stock = stock
    reward.image = image
    await db.commit()
    await db.refresh(reward)
    return reward


async def delete_reward(db: AsyncSession, reward_id: int) -> None:
    await db.execute(delete(Reward).where(Reward.id == reward_id))
    await db.commit()
