import { LeaderboardResponse } from "@/types/api";

function movementLabel(rankChange: number): string {
  if (rankChange > 0) {
    return `↑${rankChange}`;
  }
  if (rankChange < 0) {
    return `↓${Math.abs(rankChange)}`;
  }
  return "→";
}

function movementClass(rankChange: number): string {
  if (rankChange > 0) {
    return "text-emerald-400";
  }
  if (rankChange < 0) {
    return "text-rose-400";
  }
  return "text-zinc-500";
}

export function LeaderboardTable({ data }: { data: LeaderboardResponse }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/70 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-950/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Last Match</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.player_id} className="border-t border-white/5 text-zinc-100 transition hover:bg-white/[0.02]">
                <td className="px-4 py-3 tabular-nums">
                  <span className="font-semibold">#{row.rank}</span>{" "}
                  <span className={movementClass(row.rank_change)}>{movementLabel(row.rank_change)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{row.player_name}</span>
                  {row.is_mvp ? <span className="ml-2">👑</span> : null}
                </td>
                <td className="px-4 py-3 tabular-nums">{row.total_points.toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums">{row.last_match_points === null ? "-" : row.last_match_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pending_players.length > 0 ? (
        <div className="border-t border-amber-400/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-300 sm:px-6">
          Score pending: {data.pending_players.join(", ")}
        </div>
      ) : null}
    </section>
  );
}
