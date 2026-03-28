import Link from "next/link";

import { HoverLift } from "@/components/motion-fx";
import { PlaceholderPanel } from "@/components/placeholder-panel";
import { getMatches, getSeasons } from "@/lib/api";

export default async function PlayPage() {
  let error = false;
  let noSeason = false;
  let noLink = false;
  let matchName = "";
  let matchDate = "";
  let contestUrl = "";

  try {
    const seasons = await getSeasons();
    const active = seasons.find((season) => season.is_active) ?? seasons[0];
    if (!active) {
      noSeason = true;
    } else {
      const matches = await getMatches(active.id);
      const withLinks = matches
        .filter((match) => typeof match.contest_url === "string" && match.contest_url.trim().length > 0)
        .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

      const latest = withLinks[0];
      if (!latest || !latest.contest_url) {
        noLink = true;
      } else {
        matchName = latest.name;
        matchDate = latest.match_date;
        contestUrl = latest.contest_url;
      }
    }
  } catch {
    error = true;
  }

  if (error) {
    return (
      <PlaceholderPanel
        title="Play Today"
        description="Could not load today's contest link right now. Please try again in a few moments."
      />
    );
  }

  if (noSeason) {
    return <PlaceholderPanel title="Play Today" description="No active season yet. Ask admin to create one." />;
  }

  if (noLink) {
    return (
      <PlaceholderPanel
        title="Play Today"
        description="No contest link has been posted for the active season yet. Check back later today."
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-cyan-300/20 bg-linear-to-b from-cyan-500/20 via-sky-500/10 to-zinc-900/80 p-5 shadow-[0_18px_46px_rgba(2,6,23,0.4)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Daily Link</p>
            <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>Play Today</h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-200 sm:text-base">
              One tap to open today&apos;s contest. No clutter, no searching, just the active league link.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Today&apos;s Match</p>
            <p className="text-sm font-semibold text-zinc-100">{matchName}</p>
            <p className="text-xs text-zinc-400">{new Date(matchDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-center sm:justify-start">
          <HoverLift>
            <Link
              href={contestUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-[220px] items-center justify-center rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-8 py-4 text-lg font-bold text-white shadow-[0_20px_60px_rgba(6,182,212,0.35)] transition"
            >
              Open Contest Now
            </Link>
          </HoverLift>
        </div>
      </div>
    </section>
  );
}
