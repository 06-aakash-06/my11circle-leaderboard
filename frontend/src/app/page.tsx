import { LeaderboardTable } from "@/components/leaderboard-table";
import { HoverLift } from "@/components/motion-fx";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { getLeaderboard, getSeasons } from "@/lib/api";
import Link from "next/link";

export default async function Home() {
  let contentType: "ready" | "empty" | "error" = "empty";
  let leaderboardData: Awaited<ReturnType<typeof getLeaderboard>> | null = null;
  let activeSeasonName = "Season Leaderboard";
  try {
    const seasons = await getSeasons();
    const active = seasons.find((season) => season.is_active) ?? seasons[0];
    if (active) {
      activeSeasonName = active.name;
      leaderboardData = await getLeaderboard(active.id);
      contentType = "ready";
    }
  } catch {
    contentType = "error";
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-3xl border border-white/10 bg-linear-to-r from-orange-500/20 via-rose-500/10 to-zinc-900 p-4 shadow-[0_16px_40px_rgba(2,6,23,0.45)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              {activeSeasonName}
            </h2>
            <p className="mt-1 text-sm text-zinc-300">Live rankings, pending-score awareness, and rapid season tracking.</p>
          </div>
          {leaderboardData?.latest_match_name ? (
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Latest Match</p>
              <p className="text-sm font-semibold text-zinc-100">{leaderboardData.latest_match_name}</p>
            </div>
          ) : null}
        </div>
      </div>
      {contentType === "ready" && leaderboardData ? (
        <LeaderboardTable data={leaderboardData} />
      ) : contentType === "error" ? (
        <PlaceholderPanel
          title="Backend connection pending"
          description="The UI shell is live, but API data is unavailable. Start the FastAPI server and verify NEXT_PUBLIC_API_URL to continue."
        />
      ) : (
        <PlaceholderPanel
          title="Season data is not ready"
          description="Configure backend and Supabase credentials, then seed your first season to render the leaderboard here."
        />
      )}

      <div className="pt-2">
        <HoverLift>
          <Link
            href="/play"
            className="mx-auto block w-full max-w-xl rounded-2xl border border-cyan-300/30 bg-linear-to-r from-cyan-500/90 to-sky-500/90 px-5 py-3 text-center text-base font-bold text-white shadow-[0_18px_50px_rgba(14,165,233,0.3)] transition"
          >
            Open Play Today
          </Link>
        </HoverLift>
      </div>
    </section>
  );
}
