from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_admin
from app.db.supabase_client import get_supabase_client
from app.models.league import (
	DeleteResponse,
	MatchCreate,
	MatchDetailOut,
	MatchOut,
	MatchScoreOut,
	MatchUpdate,
	SaveScoresRequest,
	SaveScoresResponse,
)

router = APIRouter(tags=["matches"])


@router.get("/seasons/{season_id}/matches", response_model=list[MatchOut])
def list_matches(season_id: UUID) -> list[MatchOut]:
	client = get_supabase_client()
	result = (
		client.table("matches")
		.select("id,season_id,name,match_date,contest_url,multiplier,is_complete,created_at")
		.eq("season_id", str(season_id))
		.order("match_date")
		.execute()
	)
	return [MatchOut.model_validate(row) for row in (result.data or [])]


@router.post("/seasons/{season_id}/matches", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(season_id: UUID, payload: MatchCreate, _: str = Depends(require_admin)) -> MatchOut:
	client = get_supabase_client()
	result = (
		client.table("matches")
		.insert({**payload.model_dump(mode="json"), "season_id": str(season_id)})
		.execute()
	)
	if not result.data:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create match")
	return MatchOut.model_validate(result.data[0])


@router.get("/matches/{match_id}", response_model=MatchDetailOut)
def get_match(match_id: UUID) -> MatchDetailOut:
	client = get_supabase_client()
	match_result = (
		client.table("matches")
		.select("id,season_id,name,match_date,contest_url,multiplier,is_complete,created_at")
		.eq("id", str(match_id))
		.limit(1)
		.execute()
	)
	if not match_result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

	match_row = match_result.data[0]
	players = (
		client.table("players")
		.select("id,name")
		.eq("season_id", match_row["season_id"])
		.execute()
	).data or []
	name_by_player = {str(player["id"]): player["name"] for player in players}

	scores = (
		client.table("scores")
		.select("id,player_id,raw_points,multiplied_points,source")
		.eq("match_id", str(match_id))
		.execute()
	).data or []

	score_rows = [
		MatchScoreOut.model_validate(
			{
				**row,
				"player_name": name_by_player.get(str(row["player_id"]), "Unknown"),
			}
		)
		for row in scores
	]

	payload = {**match_row, "scores": sorted(score_rows, key=lambda row: row.multiplied_points, reverse=True)}
	return MatchDetailOut.model_validate(payload)


@router.patch("/matches/{match_id}", response_model=MatchOut)
def update_match(match_id: UUID, payload: MatchUpdate, _: str = Depends(require_admin)) -> MatchOut:
	updates = payload.model_dump(mode="json", exclude_none=True)
	if not updates:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided")

	client = get_supabase_client()
	result = client.table("matches").update(updates).eq("id", str(match_id)).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
	return MatchOut.model_validate(result.data[0])


@router.delete("/matches/{match_id}", response_model=DeleteResponse)
def delete_match(match_id: UUID, _: str = Depends(require_admin)) -> DeleteResponse:
	client = get_supabase_client()
	result = client.table("matches").delete().eq("id", str(match_id)).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
	return DeleteResponse(success=True, message="Match removed")


@router.post("/matches/{match_id}/save-scores", response_model=SaveScoresResponse)
def save_match_scores(match_id: UUID, payload: SaveScoresRequest, _: str = Depends(require_admin)) -> SaveScoresResponse:
	if len(payload.scores) == 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one score is required")

	client = get_supabase_client()

	match_exists = client.table("matches").select("id").eq("id", str(match_id)).limit(1).execute()
	if not match_exists.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

	upsert_payload = [
		{
			"match_id": str(match_id),
			"player_id": str(entry.player_id),
			"raw_points": 0 if entry.source == "absent" else entry.raw_points,
			"source": entry.source,
		}
		for entry in payload.scores
	]

	client.table("scores").upsert(upsert_payload, on_conflict="match_id,player_id").execute()
	client.table("matches").update({"is_complete": True}).eq("id", str(match_id)).execute()

	return SaveScoresResponse(success=True, saved_count=len(upsert_payload))
