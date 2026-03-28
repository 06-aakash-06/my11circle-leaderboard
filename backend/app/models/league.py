from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


ScoreSource = Literal["scraped", "manual", "absent"]


class PlayerOut(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    created_at: Optional[datetime] = None


class SeasonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True


class SeasonUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class SeasonDetailOut(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: Optional[date] = None
    is_active: bool
    players: list[PlayerOut]
    match_count: int


class PlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class MatchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    match_date: date
    contest_url: Optional[str] = None
    multiplier: float = Field(default=1.0, ge=1.0, le=3.0)


class MatchUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    match_date: Optional[date] = None
    contest_url: Optional[str] = None
    multiplier: Optional[float] = Field(default=None, ge=1.0, le=3.0)
    is_complete: Optional[bool] = None


class MatchOut(BaseModel):
    id: UUID
    season_id: UUID
    name: str
    match_date: date
    contest_url: Optional[str] = None
    multiplier: float
    is_complete: bool
    created_at: Optional[datetime] = None


class MatchScoreOut(BaseModel):
    id: UUID
    player_id: UUID
    player_name: str
    raw_points: float
    multiplied_points: float
    source: ScoreSource


class MatchDetailOut(MatchOut):
    scores: list[MatchScoreOut]


class SaveScoreEntry(BaseModel):
    player_id: UUID
    raw_points: float = 0
    source: ScoreSource


class SaveScoresRequest(BaseModel):
    scores: list[SaveScoreEntry]


class SaveScoresResponse(BaseModel):
    success: bool
    saved_count: int


class ParseScreenshotResponse(BaseModel):
    score: float | None
    confidence: float


class OCRMatchedScore(BaseModel):
    player_id: UUID
    player_name: str
    extracted_name: str
    score: float
    confidence: float


class ParseScoreboardResponse(BaseModel):
    matched: list[OCRMatchedScore]
    unmatched_aliases: list[str]
    unmatched_players: list[str]


class ScoreUpdate(BaseModel):
    raw_points: Optional[float] = None
    source: Optional[ScoreSource] = None


class DeleteResponse(BaseModel):
    success: bool
    message: str
