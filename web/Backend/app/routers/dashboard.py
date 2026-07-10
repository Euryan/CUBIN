from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.services.report_service import get_dashboard_summary
from app.schemas.report import DashboardSummary

dashboard_router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@dashboard_router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(db: AsyncSession = Depends(get_async_session)):
    return await get_dashboard_summary(db)
