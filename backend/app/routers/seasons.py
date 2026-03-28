from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_admin
from app.db.supabase_client import get_supabase_client
from app.models.league import SeasonCreate, SeasonDetailOut, SeasonUpdate
from app.models.season import LeaderboardResponseOut, SeasonOut
from app.services.season_service import get_leaderboard_for_season, list_seasons

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("", response_model=list[SeasonOut])
def get_seasons() -> list[SeasonOut]:
	try:
		return [SeasonOut.model_validate(item) for item in list_seasons()]
	except RuntimeError as exc:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/{season_id}/leaderboard", response_model=LeaderboardResponseOut)
def get_season_leaderboard(season_id: UUID) -> LeaderboardResponseOut:
	try:
		payload = get_leaderboard_for_season(season_id)
	except RuntimeError as exc:
		raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

	return LeaderboardResponseOut.model_validate(payload)


@router.post("", response_model=SeasonOut, status_code=status.HTTP_201_CREATED)
def create_season(payload: SeasonCreate, _: str = Depends(require_admin)) -> SeasonOut:
	client = get_supabase_client()
	data = payload.model_dump(mode="json")
	if data.get("is_active"):
		client.table("seasons").update({"is_active": False}).neq("is_active", False).execute()
	result = client.table("seasons").insert(data).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create season")
	return SeasonOut.model_validate(result.data[0])


@router.get("/{season_id}", response_model=SeasonDetailOut)
def get_season_detail(season_id: UUID) -> SeasonDetailOut:
	client = get_supabase_client()

	season_result = (
		client.table("seasons")
		.select("id,name,start_date,end_date,is_active")
		.eq("id", str(season_id))
		.limit(1)
		.execute()
	)
	if not season_result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")

	players_result = (
		client.table("players")
		.select("id,season_id,name,created_at")
		.eq("season_id", str(season_id))
		.order("name")
		.execute()
	)

	matches_count_result = (
		client.table("matches")
		.select("id", count="exact")
		.eq("season_id", str(season_id))
		.execute()
	)

	payload = {
		**season_result.data[0],
		"players": players_result.data or [],
		"match_count": matches_count_result.count or 0,
	}
	return SeasonDetailOut.model_validate(payload)


@router.patch("/{season_id}", response_model=SeasonOut)
def update_season(season_id: UUID, payload: SeasonUpdate, _: str = Depends(require_admin)) -> SeasonOut:
	updates = payload.model_dump(mode="json", exclude_none=True)
	if not updates:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided")

	client = get_supabase_client()
	if updates.get("is_active"):
		client.table("seasons").update({"is_active": False}).neq("id", str(season_id)).execute()
	result = (
		client.table("seasons")
		.update(updates)
		.eq("id", str(season_id))
		.execute()
	)
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
	return SeasonOut.model_validate(result.data[0])


@router.delete("/{season_id}", status_code=status.HTTP_200_OK)
def delete_season(season_id: UUID, _: str = Depends(require_admin)) -> dict[str, bool]:
	client = get_supabase_client()
	result = client.table("seasons").delete().eq("id", str(season_id)).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Season not found")
	return {"success": True}
