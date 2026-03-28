"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { Player, Season } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type Status = {
  kind: "success" | "error";
  message: string;
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
      // Fallback to generic detail.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export default function AdminPlayersPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  async function loadSeasons() {
    const fetched = await fetchJson<Season[]>("/seasons");
    setSeasons(fetched);
    const active = fetched.find((season) => season.is_active) ?? fetched[0];
    if (active) {
      setSelectedSeasonId(active.id);
    }
  }

  async function loadPlayers(seasonId: string) {
    const fetched = await fetchJson<Player[]>(`/seasons/${seasonId}/players`);
    setPlayers(fetched);
  }

  useEffect(() => {
    loadSeasons().catch((error: Error) => setStatus({ kind: "error", message: error.message }));
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) {
      return;
    }
    loadPlayers(selectedSeasonId).catch((error: Error) => setStatus({ kind: "error", message: error.message }));
  }, [selectedSeasonId]);

  async function onAddPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeasonId || !name.trim()) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await fetchJson<Player>(`/seasons/${selectedSeasonId}/players`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      setName("");
      await loadPlayers(selectedSeasonId);
      setStatus({ kind: "success", message: "Player added" });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onDeletePlayer(playerId: string) {
    if (!selectedSeasonId) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await fetchJson<{ success: boolean }>(`/players/${playerId}`, {
        method: "DELETE",
      });
      await loadPlayers(selectedSeasonId);
      setStatus({ kind: "success", message: "Player removed" });
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
        <h2 className="text-xl font-semibold text-white">Manage Players</h2>
        <p className="mt-1 text-sm text-zinc-400">Add or remove players for the active season.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <label className="text-sm text-zinc-300" htmlFor="season">
          Season
        </label>
        <select
          id="season"
          value={selectedSeasonId}
          onChange={(event) => setSelectedSeasonId(event.target.value)}
          className="fx-select mt-2"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs text-zinc-500">Selected: {activeSeason?.name ?? "No season"}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onAddPlayer}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Player name"
            className="fx-input flex-1"
          />
          <button
            type="submit"
            disabled={isBusy || !selectedSeasonId}
            className="fx-button-primary"
          >
            Add Player
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white">Season Players</h3>
        <div className="mt-3 space-y-2">
          {players.length === 0 ? (
            <p className="text-sm text-zinc-400">No players yet.</p>
          ) : (
            players.map((player) => (
              <div key={player.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950 px-3 py-2">
                <span className="text-zinc-200">{player.name}</span>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onDeletePlayer(player.id)}
                  className="rounded-md border border-rose-500/30 px-2 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
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
