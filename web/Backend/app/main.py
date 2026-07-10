from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models.category import Category
from app.routers import auth_router, user_router, trash_router, reward_router, admin_router, dashboard_router, ai_router
from app.utils.logging import configure_logging

configure_logging()

DEFAULT_CATEGORIES = [
    {"name": "Plastik", "price": 10000, "description": "Kategori default plastik untuk demo dan transaksi awal."},
    {"name": "Kaleng", "price": 25000, "description": "Kategori default kaleng untuk demo dan transaksi awal."},
    {"name": "Kertas", "price": 5000, "description": "Kategori default kertas untuk demo dan transaksi awal."},
    {"name": "Kaca", "price": 10000, "description": "Kategori default kaca untuk demo dan transaksi awal."},
    {"name": "Elektronik", "price": 20000, "description": "Kategori default elektronik untuk demo dan transaksi awal."},
    {"name": "Lainnya", "price": 9000, "description": "Kategori default lainnya untuk demo dan transaksi awal."},
]

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Waste Management API with RFID, reward system, and AI integration",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        for item in DEFAULT_CATEGORIES:
            existing = await session.execute(select(Category).where(Category.name == item["name"]))
            if existing.scalar_one_or_none():
                continue

            session.add(Category(**item))

        await session.commit()

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(trash_router)
app.include_router(reward_router)
app.include_router(admin_router)
app.include_router(dashboard_router)
app.include_router(ai_router)
