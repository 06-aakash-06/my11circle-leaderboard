"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/match/new", label: "Add Match" },
  { href: "/admin/players", label: "Players" },
];

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isBusy, setIsBusy] = useState(false);

  async function onLogout() {
    setIsBusy(true);
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setIsBusy(false);
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <nav className="rounded-2xl border border-cyan-300/20 bg-zinc-900/75 p-3 shadow-[0_10px_24px_rgba(2,6,23,0.3)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border border-cyan-300/45 bg-cyan-500/15 text-cyan-100 shadow-[0_8px_20px_rgba(6,182,212,0.22)]"
                    : "border border-white/15 bg-zinc-950 text-zinc-100 hover:border-cyan-300/40 hover:text-cyan-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={onLogout}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-400/45 disabled:opacity-60"
        >
          {isBusy ? "Logging out..." : "Logout"}
        </button>
      </div>
    </nav>
  );
}
