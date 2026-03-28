import { PlaceholderPanel } from "@/components/placeholder-panel";
import { getMatches, getSeasonDetail, getSeasons } from "@/lib/api";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminPage() {
  let error = false;
  let noSeason = false;
  let seasonName = "";
  let playerCount = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let todayCount = 0;
  let pendingMatches: Awaited<ReturnType<typeof getMatches>> = [];

  try {
    const seasons = await getSeasons();
    const active = seasons.find((season) => season.is_active) ?? seasons[0];
    if (!active) {
      noSeason = true;
    } else {
      const [detail, matches] = await Promise.all([getSeasonDetail(active.id), getMatches(active.id)]);
      seasonName = detail.name;
      playerCount = detail.players.length;
      completedCount = matches.filter((match) => match.is_complete).length;
      pendingCount = matches.length - completedCount;
      const today = new Date().toISOString().slice(0, 10);
      todayCount = matches.filter((match) => match.match_date.slice(0, 10) === today).length;
      pendingMatches = matches
        .filter((match) => !match.is_complete)
        .sort((a, b) => b.match_date.localeCompare(a.match_date))
        .slice(0, 5);
    }
  } catch {
    error = true;
  }

  if (error) {
    return (
      <PlaceholderPanel
        title="Admin Dashboard"
        description="Admin metrics are unavailable until backend connectivity and database records are ready."
      />
    );
  }

  if (noSeason) {
    return (
      <section className="space-y-4">
        <AdminNav />
        <div className="rounded-2xl border border-orange-400/20 bg-linear-to-r from-orange-500/15 via-rose-500/10 to-zinc-900 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-white">No Season Yet</h2>
          <p className="mt-1 text-sm text-zinc-300">Create your first season to unlock players, matches, and scoring.</p>
          <Link
            href="/admin/seasons"
            className="mt-4 inline-flex rounded-lg bg-linear-to-r from-orange-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Create First Season
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <AdminNav />
      <div className="rounded-3xl border border-cyan-300/20 bg-linear-to-br from-cyan-500/16 via-sky-500/8 to-orange-500/12 p-5 shadow-[0_18px_45px_rgba(3,7,18,0.45)] sm:p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Admin Command Center</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Tonight&apos;s Workflow
          </h1>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
            {seasonName}
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-zinc-200/90 sm:text-base">
          Start with pending matches, score quickly, and keep the league updated in minutes.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/matches"
            className="rounded-2xl border border-amber-300/35 bg-amber-500/12 px-4 py-3 text-sm font-semibold text-amber-100 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-500/18"
          >
            Score Pending Matches
          </Link>
          <Link
            href="/admin/match/new"
            className="rounded-2xl border border-cyan-300/35 bg-cyan-500/14 px-4 py-3 text-sm font-semibold text-cyan-100 transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-500/20"
          >
            Add Tonight&apos;s Match
          </Link>
          <Link
            href="/captain"
            className="rounded-2xl border border-sky-300/35 bg-sky-500/12 px-4 py-3 text-sm font-semibold text-sky-100 transition duration-200 hover:-translate-y-0.5 hover:bg-sky-500/18"
          >
            Open Admin Desk
          </Link>
          <Link
            href="/admin/players"
            className="rounded-2xl border border-white/20 bg-zinc-900/75 px-4 py-3 text-sm font-semibold text-zinc-100 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40"
          >
            Update Players
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_16px_38px_rgba(2,6,23,0.35)] sm:p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Pending Queue</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Matches Needing Scores</h2>
          <p className="mt-1 text-sm text-zinc-400">Prioritize these first to keep rankings live.</p>
          {pendingMatches.length > 0 ? (
            <div className="mt-4 space-y-2">
              {pendingMatches.map((match) => (
                <div key={match.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{match.name}</p>
                    <p className="text-xs text-zinc-400">{new Date(match.match_date).toLocaleDateString()}</p>
                  </div>
                  <Link
                    href={`/admin/match/${match.id}`}
                    className="rounded-xl border border-amber-300/35 bg-amber-500/12 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/18"
                  >
                    Score Now
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              All clear. No pending matches right now.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Players</p>
              <h3 className="mt-2 text-2xl font-semibold text-white tabular-nums">{playerCount}</h3>
            </article>
            <article className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Today&apos;s Matches</p>
              <h3 className="mt-2 text-2xl font-semibold text-white tabular-nums">{todayCount}</h3>
            </article>
            <article className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Matches Played</p>
              <h3 className="mt-2 text-2xl font-semibold text-white tabular-nums">{completedCount}</h3>
            </article>
            <article className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_10px_24px_rgba(2,6,23,0.32)]">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Pending Matches</p>
              <h3 className={`mt-2 text-2xl font-semibold tabular-nums ${pendingCount > 0 ? "text-amber-300" : "text-white"}`}>
                {pendingCount}
              </h3>
            </article>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Maintenance</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/admin/seasons"
                className="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-cyan-400/45"
              >
                Manage Seasons
              </Link>
              <Link
                href="/admin/matches"
                className="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-cyan-400/45"
              >
                Manage Matches
              </Link>
              <Link
                href="/admin/login"
                className="rounded-xl border border-white/15 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 transition hover:border-cyan-400/45"
              >
                Re-authenticate
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
