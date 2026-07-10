from datetime import date, datetime
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_users: int
    total_trash_collected: float
    total_plastic_recycled: float
    total_reward_distributed: float
    daily_statistics: dict
    monthly_statistics: dict


class WeeklyGraphPoint(BaseModel):
    date: date
    weight: float
    points: float


class StatisticResponse(BaseModel):
    total_users: int
    total_trash_entries: int
    total_rewards: int
    total_points: float
    total_revenue: float
    weekly_graph: list[WeeklyGraphPoint]
