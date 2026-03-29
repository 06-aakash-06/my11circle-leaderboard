"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { Season } from "@/types/api";

const API_URL = "/api/backend";

type Status = {
  kind: "success" | "error";
  message: string;
};

type SeasonForm = {
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // Keep default detail.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [form, setForm] = useState<SeasonForm>({
    name: "",
    start_date: todayString(),
    end_date: "",
    is_active: true,
  });

  const activeSeason = useMemo(() => seasons.find((season) => season.is_active) ?? null, [seasons]);

  async function loadSeasons() {
    const data = await fetchJson<Season[]>("/seasons");
    setSeasons(data);
  }

  useEffect(() => {
    loadSeasons().catch((error: Error) => setStatus({ kind: "error", message: error.message }));
  }, []);

  async function onCreateSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await fetchJson<Season>("/seasons", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          start_date: form.start_date,
          end_date: form.end_date.trim() || null,
          is_active: form.is_active,
        }),
      });
      setForm({ name: "", start_date: todayString(), end_date: "", is_active: true });
      await loadSeasons();
      setStatus({ kind: "success", message: "Season created successfully." });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onSetActive(seasonId: string) {
    setIsBusy(true);
    setStatus(null);
    try {
      await fetchJson<Season>(`/seasons/${seasonId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: true }),
      });
      await loadSeasons();
      setStatus({ kind: "success", message: "Active season updated." });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onDelete(seasonId: string) {
    setIsBusy(true);
    setStatus(null);
    try {
      await fetchJson<{ success: boolean }>(`/seasons/${seasonId}`, { method: "DELETE" });
      await loadSeasons();
      setStatus({ kind: "success", message: "Season deleted." });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <AdminNav />

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-white">Manage Seasons</h2>
        <p className="mt-1 text-sm text-zinc-400">Create seasons, set one active, and keep your league timeline clean.</p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
          Current Active: {activeSeason ? activeSeason.name : "None"}
        </p>
      </div>

      <form className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6" onSubmit={onCreateSeason}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-zinc-300 sm:col-span-2">
            <span>Season Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="IPL 2026"
              className="fx-input"
              required
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-300">
            <span>Start Date</span>
            <input
              type="date"
              value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              className="fx-input"
              required
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-300">
            <span>End Date (optional)</span>
            <input
              type="date"
              value={form.end_date}
              onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
              className="fx-input"
            />
          </label>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
          />
          Set as active season
        </label>

        <button
          type="submit"
          disabled={isBusy}
          className="fx-button-primary mt-4"
        >
          Create Season
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white">All Seasons</h3>
        <div className="mt-3 space-y-2">
          {seasons.length === 0 ? (
            <p className="text-sm text-zinc-400">No seasons created yet.</p>
          ) : (
            seasons.map((season) => (
              <article
                key={season.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950 px-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{season.name}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(season.start_date).toLocaleDateString()}
                    {season.end_date ? ` - ${new Date(season.end_date).toLocaleDateString()}` : " - ongoing"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      season.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/40 text-zinc-300"
                    }`}
                  >
                    {season.is_active ? "ACTIVE" : "ARCHIVE"}
                  </span>
                  {!season.is_active ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetActive(season.id)}
                      className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-semibold text-sky-300 transition hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      Set Active
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onDelete(season.id)}
                    className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {status ? (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            status.kind === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {status.message}
        </div>
      ) : null}
    </section>
  );
}
