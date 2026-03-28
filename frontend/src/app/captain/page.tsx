import Link from "next/link";

import { FadeUp, HoverLift } from "@/components/motion-fx";

const dailyItems = [
  {
    href: "/admin/matches",
    title: "Score Match",
    subtitle: "Open match list and click Add/Edit Scores",
    tone: "from-cyan-500/25 to-blue-500/20 border-cyan-300/30",
  },
  {
    href: "/admin/match/new",
    title: "Add New Match",
    subtitle: "Create one or even two contests in a day",
    tone: "from-emerald-500/20 to-teal-500/15 border-emerald-300/30",
  },
  {
    href: "/admin/login",
    title: "Login",
    subtitle: "Authenticate quickly before daily updates",
    tone: "from-orange-500/20 to-amber-500/15 border-orange-300/30",
  },
];

const managementItems = [
  { href: "/admin", title: "Admin Dashboard", subtitle: "Daily overview and controls" },
  { href: "/admin/players", title: "Manage Players", subtitle: "Roster updates" },
  { href: "/admin/seasons", title: "Manage Seasons", subtitle: "Switch active season" },
];

export default function CaptainPage() {
  return (
    <section className="space-y-4">
      <FadeUp>
        <div className="fx-card p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-orange-300/80">Operations</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Admin Desk
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300 sm:text-base">
            Daily shortcut area for quick login, adding one or multiple matches, and score updates.
          </p>
        </div>
      </FadeUp>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Daily Essentials</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dailyItems.map((item, index) => (
            <FadeUp key={item.href} delay={0.03 * index}>
              <HoverLift>
                <Link href={item.href} className={`fx-card block border bg-linear-to-br p-4 sm:p-5 ${item.tone}`}>
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-200">{item.subtitle}</p>
                </Link>
              </HoverLift>
            </FadeUp>
          ))}
        </div>

        <p className="pt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Management</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managementItems.map((item, index) => (
            <FadeUp key={item.href} delay={0.04 * index}>
              <HoverLift>
                <Link href={item.href} className="fx-card block p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">{item.subtitle}</p>
                </Link>
              </HoverLift>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
