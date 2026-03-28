from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_admin
from app.db.supabase_client import get_supabase_client
from app.models.league import DeleteResponse, PlayerCreate, PlayerOut

router = APIRouter(tags=["players"])


@router.get("/seasons/{season_id}/players", response_model=list[PlayerOut])
def list_players(season_id: UUID) -> list[PlayerOut]:
	client = get_supabase_client()
	result = (
		client.table("players")
		.select("id,season_id,name,created_at")
		.eq("season_id", str(season_id))
		.order("name")
		.execute()
	)
	return [PlayerOut.model_validate(row) for row in (result.data or [])]


@router.post("/seasons/{season_id}/players", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def add_player(season_id: UUID, payload: PlayerCreate, _: str = Depends(require_admin)) -> PlayerOut:
	client = get_supabase_client()
	result = (
		client.table("players")
		.insert({"season_id": str(season_id), "name": payload.name.strip()})
		.execute()
	)
	if not result.data:
		raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create player")
	return PlayerOut.model_validate(result.data[0])


@router.delete("/players/{player_id}", response_model=DeleteResponse)
def delete_player(player_id: UUID, _: str = Depends(require_admin)) -> DeleteResponse:
	client = get_supabase_client()

	score_count = (
		client.table("scores")
		.select("id", count="exact")
		.eq("player_id", str(player_id))
		.execute()
	)
	if (score_count.count or 0) > 0:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="Cannot remove player with existing scores",
		)

	result = client.table("players").delete().eq("id", str(player_id)).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")

	return DeleteResponse(success=True, message="Player removed")
