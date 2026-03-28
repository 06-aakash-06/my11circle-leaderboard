import { MultiplierBadge } from "@/components/multiplier-badge";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { getMatches, getSeasons } from "@/lib/api";
import Link from "next/link";
import { HoverLift } from "@/components/motion-fx";

export default async function MatchesPage() {
  let error = false;
  let activeSeasonName: string | null = null;
  let matches: Awaited<ReturnType<typeof getMatches>> = [];

  try {
    const seasons = await getSeasons();
    const active = seasons.find((season) => season.is_active) ?? seasons[0];
    if (active) {
      activeSeasonName = active.name;
      matches = await getMatches(active.id);
    }
  } catch {
    error = true;
  }

  if (error) {
    return (
      <PlaceholderPanel
        title="Match History"
        description="Could not load match data yet. Check backend connectivity and environment setup."
      />
    );
  }

  if (!activeSeasonName) {
    return <PlaceholderPanel title="No seasons yet" description="Create your first season from admin seasons to unlock match history." />;
  }

  if (matches.length === 0) {
    return (
      <PlaceholderPanel
        title="Match History"
        description="No matches found for the active season yet. Add matches from the admin panel."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 px-4 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.35)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            {activeSeasonName} Match History
          </h2>
          <p className="text-sm text-zinc-400">{matches.length} matches</p>
        </div>
      </div>
      <div className="grid gap-3">
        {matches.map((match) => (
          <HoverLift key={match.id}>
            <article className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 shadow-[0_12px_28px_rgba(2,6,23,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{match.name}</h3>
                  <p className="text-sm text-zinc-400">{new Date(match.match_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MultiplierBadge value={match.multiplier} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      match.is_complete ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {match.is_complete ? "Complete" : "Pending"}
                  </span>
                  <Link
                    href={`/admin/match/${match.id}`}
                    className="rounded-full border border-white/15 bg-zinc-950 px-2 py-0.5 text-xs font-medium text-zinc-200 transition hover:border-orange-400/50"
                  >
                    Edit Scores
                  </Link>
                </div>
              </div>
            </article>
          </HoverLift>
        ))}
      </div>
    </section>
  );
}
