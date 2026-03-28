from collections import defaultdict
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.db.supabase_client import get_supabase_client


def _sorted_rows_with_rank(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sorted_rows = sorted(rows, key=lambda row: float(row.get("total_points") or 0), reverse=True)
    ranked: List[Dict[str, Any]] = []
    current_rank = 0
    previous_points: Optional[float] = None

    for index, row in enumerate(sorted_rows, start=1):
        points = float(row.get("total_points") or 0)
        if previous_points is None or points < previous_points:
            current_rank = index
            previous_points = points
        ranked.append({**row, "rank": current_rank})

    return ranked


def list_seasons() -> List[Dict[str, Any]]:
    client = get_supabase_client()
    result = (
        client.table("seasons")
        .select("id,name,start_date,end_date,is_active")
        .order("start_date", desc=True)
        .execute()
    )
    return result.data or []


def get_leaderboard_for_season(season_id: UUID) -> Dict[str, Any]:
    client = get_supabase_client()

    matches_result = (
        client.table("matches")
        .select("id,name,match_date,is_complete,multiplier")
        .eq("season_id", str(season_id))
        .order("match_date", desc=False)
        .execute()
    )
    matches = matches_result.data or []
    complete_matches = [match for match in matches if match.get("is_complete")]

    latest_complete = complete_matches[-1] if complete_matches else None
    previous_complete = complete_matches[-2] if len(complete_matches) > 1 else None

    leaderboard_rows = (
        client.table("season_leaderboard")
        .select("id,name,total_points")
        .eq("season_id", str(season_id))
        .execute()
    ).data or []

    current_ranked = _sorted_rows_with_rank(
        [
            {
                "player_id": row.get("id"),
                "player_name": row.get("name"),
                "total_points": float(row.get("total_points") or 0),
            }
            for row in leaderboard_rows
        ]
    )

    rank_change_map: Dict[str, int] = defaultdict(int)
    last_match_points_map: Dict[str, float] = {}
    mvp_ids: set[str] = set()

    if latest_complete:
        latest_scores = (
            client.table("scores")
            .select("player_id,raw_points,multiplied_points")
            .eq("match_id", latest_complete["id"])
            .execute()
        ).data or []

        if latest_scores:
            top_value = max(float(score.get("multiplied_points") or 0) for score in latest_scores)
            mvp_ids = {
                str(score["player_id"])
                for score in latest_scores
                if float(score.get("multiplied_points") or 0) == top_value
            }
            for score in latest_scores:
                last_match_points_map[str(score["player_id"])] = float(score.get("raw_points") or 0)

    if previous_complete:
        prev_rows = (
            client.table("scores")
            .select("player_id,multiplied_points")
            .in_("match_id", [match["id"] for match in complete_matches[:-1]])
            .execute()
        ).data or []

        previous_totals: Dict[str, float] = defaultdict(float)
        for row in prev_rows:
            previous_totals[str(row["player_id"])] += float(row.get("multiplied_points") or 0)

        previous_ranked = _sorted_rows_with_rank(
            [
                {
                    "player_id": player_id,
                    "player_name": "",
                    "total_points": points,
                }
                for player_id, points in previous_totals.items()
            ]
        )
        previous_rank_map = {str(item["player_id"]): int(item["rank"]) for item in previous_ranked}

        for row in current_ranked:
            player_id = str(row["player_id"])
            prev_rank = previous_rank_map.get(player_id, row["rank"])
            rank_change_map[player_id] = prev_rank - row["rank"]

    latest_match_id = latest_complete["id"] if latest_complete else None
    pending_players: List[str] = []
    if latest_match_id:
        players = (
            client.table("players")
            .select("id,name")
            .eq("season_id", str(season_id))
            .execute()
        ).data or []

        scored_ids = {
            str(row["player_id"])
            for row in (
                client.table("scores").select("player_id").eq("match_id", latest_match_id).execute().data or []
            )
        }
        pending_players = [player["name"] for player in players if str(player["id"]) not in scored_ids]

    rows = [
        {
            "player_id": row["player_id"],
            "player_name": row["player_name"],
            "total_points": round(float(row["total_points"]), 2),
            "rank": row["rank"],
            "rank_change": rank_change_map.get(str(row["player_id"]), 0),
            "last_match_points": last_match_points_map.get(str(row["player_id"])),
            "is_mvp": str(row["player_id"]) in mvp_ids,
        }
        for row in current_ranked
    ]

    return {
        "season_id": str(season_id),
        "latest_match_name": latest_complete["name"] if latest_complete else None,
        "latest_match_date": latest_complete["match_date"] if latest_complete else None,
        "pending_players": pending_players,
        "rows": rows,
    }
