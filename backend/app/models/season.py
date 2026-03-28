from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class SeasonOut(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: Optional[date] = None
    is_active: bool


class LeaderboardRowOut(BaseModel):
    player_id: UUID
    player_name: str
    total_points: float
    rank: int
    rank_change: int
    last_match_points: Optional[float] = None
    is_mvp: bool


class LeaderboardResponseOut(BaseModel):
    season_id: UUID
    latest_match_name: Optional[str] = None
    latest_match_date: Optional[date] = None
    pending_players: List[str]
    rows: List[LeaderboardRowOut]
