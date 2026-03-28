from uuid import UUID
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.auth import require_admin
from app.db.supabase_client import get_supabase_client
from app.models.league import ParseScoreboardResponse, ParseScreenshotResponse, ScoreUpdate
from app.services.ocr.score_parser import parse_score_from_image, parse_scoreboard_entries

router = APIRouter(tags=["scores"])


def _normalize(value: str) -> str:
	return re.sub(r"[^a-z0-9]", "", value.lower())


def _alpha(value: str) -> str:
	return re.sub(r"[^a-z]", "", value.lower())


def _match_player(extracted_name: str, players: list[dict[str, str]]) -> dict[str, str] | None:
	name_norm = _normalize(extracted_name)
	name_alpha = _alpha(extracted_name)
	if not name_norm:
		return None

	best: dict[str, str] | None = None
	best_score = -1
	for player in players:
		score = -1
		if name_norm == player["norm"]:
			score = 100
		elif player["norm"] in name_norm or name_norm in player["norm"]:
			score = 85
		elif name_alpha and player["alpha"] and name_alpha == player["alpha"]:
			score = 80
		elif name_alpha and player["alpha"] and player["alpha"] in name_alpha and len(player["alpha"]) >= 4:
			score = 72
		elif name_alpha and player["alpha"] and name_alpha.startswith(player["alpha"][:4]) and len(player["alpha"]) >= 4:
			score = 65

		if score > best_score:
			best_score = score
			best = player

	if best_score < 60:
		return None
	return best


@router.patch("/scores/{score_id}")
def update_score(score_id: UUID, payload: ScoreUpdate, _: str = Depends(require_admin)) -> dict[str, bool]:
	updates = payload.model_dump(mode="json", exclude_none=True)
	if not updates:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields provided")

	if updates.get("source") == "absent":
		updates["raw_points"] = 0

	client = get_supabase_client()
	result = client.table("scores").update(updates).eq("id", str(score_id)).execute()
	if not result.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Score not found")

	return {"success": True}


@router.post("/matches/{match_id}/parse-screenshot", response_model=ParseScreenshotResponse)
async def parse_screenshot(
	match_id: UUID,
	file: UploadFile = File(...),
	_: str = Depends(require_admin),
) -> ParseScreenshotResponse:
	if file.content_type is None or not file.content_type.startswith("image/"):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported")

	content = await file.read()
	if len(content) == 0:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
	if len(content) > 5 * 1024 * 1024:
		raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large (max 5MB)")

	client = get_supabase_client()
	match_exists = client.table("matches").select("id").eq("id", str(match_id)).limit(1).execute()
	if not match_exists.data:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

	try:
		score, confidence = parse_score_from_image(content)
	except Exception as exc:
		raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to parse screenshot: {exc}") from exc

	return ParseScreenshotResponse(score=score, confidence=round(confidence, 2))


@router.post("/matches/{match_id}/parse-scoreboard", response_model=ParseScoreboardResponse)
async def parse_scoreboard(
	match_id: UUID,
	files: list[UploadFile] = File(...),
	_: str = Depends(require_admin),
) -> ParseScoreboardResponse:
	if not files:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload at least one image")
	if len(files) > 2:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload up to 2 screenshots at a time")

	client = get_supabase_client()
	match_row = (
		client.table("matches")
		.select("id,season_id")
		.eq("id", str(match_id))
		.limit(1)
		.execute()
	).data
	if not match_row:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")

	season_id = match_row[0]["season_id"]
	players = (
		client.table("players")
		.select("id,name")
		.eq("season_id", season_id)
		.execute()
	).data or []

	player_keys = [
		{
			"id": str(player["id"]),
			"name": str(player["name"]),
			"norm": _normalize(str(player["name"])),
			"alpha": _alpha(str(player["name"])),
		}
		for player in players
	]

	best_by_player: dict[str, dict[str, str | float]] = {}
	unmatched_aliases: set[str] = set()

	for file in files:
		if file.content_type is None or not file.content_type.startswith("image/"):
			raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported")
		content = await file.read()
		if len(content) == 0:
			continue
		if len(content) > 8 * 1024 * 1024:
			raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Each image max size is 8MB")

		try:
			entries = parse_scoreboard_entries(content)
		except Exception as exc:
			raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to parse screenshot: {exc}") from exc

		for extracted_name, score, confidence in entries:
			matched_player = _match_player(extracted_name, player_keys)
			if matched_player is None:
				unmatched_aliases.add(extracted_name)
				continue

			player_id = str(matched_player["id"])
			existing = best_by_player.get(player_id)
			if existing is None or float(confidence) > float(existing["confidence"]):
				best_by_player[player_id] = {
					"player_id": player_id,
					"player_name": str(matched_player["name"]),
					"extracted_name": extracted_name,
					"score": float(score),
					"confidence": float(confidence),
				}

	matched = list(best_by_player.values())
	matched_ids = {str(item["player_id"]) for item in matched}
	unmatched_players = [str(player["name"]) for player in player_keys if str(player["id"]) not in matched_ids]

	return ParseScoreboardResponse(
		matched=[
			{
				"player_id": item["player_id"],
				"player_name": item["player_name"],
				"extracted_name": item["extracted_name"],
				"score": item["score"],
				"confidence": round(float(item["confidence"]), 2),
			}
			for item in matched
		],
		unmatched_aliases=sorted(unmatched_aliases),
		unmatched_players=sorted(unmatched_players),
	)
