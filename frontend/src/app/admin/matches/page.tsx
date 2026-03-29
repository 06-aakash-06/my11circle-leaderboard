import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { MultiplierBadge } from "@/components/multiplier-badge";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { getMatches, getSeasons } from "@/lib/api";
import { cookies } from "next/headers";

export default async function AdminMatchesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const apiOptions = {
    headers: {
      Cookie: `admin_token=${token}`,
    },
  };

  let error = false;
  let noSeason = false;
  let seasonName = "";
  let matches: Awaited<ReturnType<typeof getMatches>> = [];

  try {
    const seasons = await getSeasons(apiOptions);
    const active = seasons.find((season) => season.is_active) ?? seasons[0];
    if (!active) {
      noSeason = true;
    } else {
      seasonName = active.name;
      matches = await getMatches(active.id, apiOptions);
    }
  } catch {
    error = true;
  }

  if (error) {
    return (
      <PlaceholderPanel
        title="Admin Matches"
        description="Match management is unavailable until backend connectivity and data are available."
      />
    );
  }

  if (noSeason) {
    return <PlaceholderPanel title="Admin Matches" description="Create a season first to manage matches." />;
  }

  return (
    <section className="space-y-4">
      <AdminNav />
      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Manage Matches</h2>
            <p className="mt-1 text-sm text-zinc-400">{seasonName}</p>
          </div>
          <Link
            href="/admin/match/new"
            className="rounded-lg border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-300"
          >
            Add New Match
          </Link>
        </div>
      </div>

      <div className="space-y-2">
        {matches.length === 0 ? (
          <PlaceholderPanel
            title="No Matches Yet"
            description="Create your first match to start tracking scores and leaderboard changes."
          />
        ) : (
          matches.map((match) => (
            <article key={match.id} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
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
                    Add/Edit Scores
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
