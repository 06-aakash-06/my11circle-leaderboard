"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { FadeUp } from "@/components/motion-fx";

const navItems = [
  { href: "/", label: "Leaderboard" },
  { href: "/play", label: "Play Today" },
  { href: "/matches", label: "Matches" },
  { href: "/season-stats", label: "Season Stats" },
  { href: "/h2h", label: "H2H" },
  { href: "/archive", label: "Archive" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 pb-20 pt-4 sm:gap-5 sm:px-6 sm:pb-16 sm:pt-6">
      <FadeUp>
        <header className="rounded-2xl border border-white/10 bg-zinc-900/75 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.45)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">FantasyLeague Tracker</p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                Private Dream11 Season Hub
              </h1>
              <p className="mt-1 text-sm text-zinc-300">Track scores, open today&apos;s contest instantly, and keep league bragging rights updated.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/captain"
                className="rounded-xl border border-orange-300/40 bg-orange-500/15 px-3 py-2 text-sm font-semibold text-orange-200 transition hover:-translate-y-0.5 hover:bg-orange-500/25"
              >
                Admin Desk
              </Link>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-linear-to-r from-sky-500/10 via-cyan-500/10 to-orange-500/10 p-2">
            <nav className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-lg border border-white/10 bg-linear-to-b from-zinc-800/90 to-zinc-900/90 px-3 py-2 text-center text-sm font-semibold text-zinc-100 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:from-sky-500/20 hover:to-cyan-500/20"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
      </FadeUp>

      <FadeUp delay={0.1} className="flex-1">
        <main className="flex-1">{children}</main>
      </FadeUp>

    </div>
  );
}
