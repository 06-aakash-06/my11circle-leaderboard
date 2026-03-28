"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { ParseScoreboardResponse, ParseScreenshotResponse, Player, Season } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type FormState = {
  name: string;
  match_date: string;
  multiplier: number;
  contest_url: string;
};

type ScoreEntry = {
  player_id: string;
  player_name: string;
  raw_points: string;
  source: "manual" | "absent";
};

type Status = {
  kind: "success" | "error";
  message: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      // Keep fallback detail.
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminCreateMatchPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [formState, setFormState] = useState<FormState>({
    name: "",
    match_date: todayDateString(),
    multiplier: 1,
    contest_url: "",
  });
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId),
    [seasons, selectedSeasonId],
  );

  useEffect(() => {
    async function loadInitial() {
      const fetchedSeasons = await requestJson<Season[]>("/seasons");
      setSeasons(fetchedSeasons);
      const active = fetchedSeasons.find((season) => season.is_active) ?? fetchedSeasons[0];
      if (active) {
        setSelectedSeasonId(active.id);
      }
    }

    loadInitial().catch((error: Error) => setStatus({ kind: "error", message: error.message }));
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) {
      return;
    }

    async function loadPlayers() {
      const fetchedPlayers = await requestJson<Player[]>(`/seasons/${selectedSeasonId}/players`);
      setScoreEntries(
        fetchedPlayers.map((player) => ({
          player_id: player.id,
          player_name: player.name,
          raw_points: "",
          source: "manual",
        })),
      );
      setOcrConfidence({});
    }

    loadPlayers().catch((error: Error) => setStatus({ kind: "error", message: error.message }));
  }, [selectedSeasonId]);

  function updateEntry(playerId: string, updates: Partial<ScoreEntry>) {
    setScoreEntries((current) =>
      current.map((entry) => (entry.player_id === playerId ? { ...entry, ...updates } : entry)),
    );
  }

  async function onUploadScreenshot(playerId: string, file: File | null) {
    if (!createdMatchId || !file) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await requestJson<ParseScreenshotResponse>(`/matches/${createdMatchId}/parse-screenshot`, {
        method: "POST",
        body: formData,
      });

      if (result.score !== null) {
        updateEntry(playerId, { raw_points: String(result.score), source: "manual" });
      }
      setOcrConfidence((current) => ({ ...current, [playerId]: result.confidence }));
      setStatus({
        kind: result.score === null ? "error" : "success",
        message:
          result.score === null
            ? "OCR confidence too low. Please verify and enter manually."
            : `OCR detected ${result.score} points (confidence ${result.confidence.toFixed(1)}).`,
      });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onUploadScoreboard(files: FileList | null) {
    if (!createdMatchId || !files || files.length === 0) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      const formData = new FormData();
      Array.from(files).slice(0, 2).forEach((file) => formData.append("files", file));

      const result = await requestJson<ParseScoreboardResponse>(`/matches/${createdMatchId}/parse-scoreboard`, {
        method: "POST",
        body: formData,
      });

      const scoreByPlayer = new Map(result.matched.map((item) => [item.player_id, item]));
      setScoreEntries((current) =>
        current.map((entry) => {
          const found = scoreByPlayer.get(entry.player_id);
          if (!found) {
            return entry;
          }
          return {
            ...entry,
            raw_points: String(found.score),
            source: "manual",
          };
        }),
      );

      setOcrConfidence((current) => {
        const next = { ...current };
        for (const item of result.matched) {
          next[item.player_id] = item.confidence;
        }
        return next;
      });

      const parts = [`Auto-filled ${result.matched.length} player scores from screenshot.`];
      if (result.unmatched_players.length > 0) {
        parts.push(`Missing players: ${result.unmatched_players.join(", ")}.`);
      }
      if (result.unmatched_aliases.length > 0) {
        parts.push(`Unmapped handles: ${result.unmatched_aliases.join(", ")}.`);
      }
      setStatus({ kind: "success", message: parts.join(" ") });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onCreateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeasonId) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      const created = await requestJson<{ id: string }>(`/seasons/${selectedSeasonId}/matches`, {
        method: "POST",
        body: JSON.stringify({
          name: formState.name,
          match_date: formState.match_date,
          multiplier: formState.multiplier,
          contest_url: formState.contest_url.trim() || null,
        }),
      });
      setCreatedMatchId(created.id);
      setStatus({
        kind: "success",
        message: "Match created. Enter scores below with manual values or OCR upload.",
      });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onSaveScores() {
    if (!createdMatchId) {
      return;
    }

    const invalid = scoreEntries.find((entry) => entry.source === "manual" && entry.raw_points.trim() === "");
    if (invalid) {
      setStatus({ kind: "error", message: `Enter score or mark absent for ${invalid.player_name}.` });
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await requestJson<{ success: boolean; saved_count: number }>(`/matches/${createdMatchId}/save-scores`, {
        method: "POST",
        body: JSON.stringify({
          scores: scoreEntries.map((entry) => ({
            player_id: entry.player_id,
            raw_points: entry.source === "absent" ? 0 : Number(entry.raw_points),
            source: entry.source,
          })),
        }),
      });
      setStatus({ kind: "success", message: "Scores saved and match marked complete." });
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
        <h2 className="text-xl font-semibold text-white">Add New Match</h2>
        <p className="mt-1 text-sm text-zinc-400">Create a match and immediately capture scores for each season player.</p>
      </div>

      <form className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6" onSubmit={onCreateMatch}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Season</span>
            <select
              value={selectedSeasonId}
              onChange={(event) => setSelectedSeasonId(event.target.value)}
              className="fx-select"
              required
            >
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Match Name</span>
            <input
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              className="fx-input"
              placeholder="CSK vs MI"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Date</span>
            <input
              type="date"
              value={formState.match_date}
              onChange={(event) => setFormState((current) => ({ ...current, match_date: event.target.value }))}
              className="fx-input"
              required
            />
          </label>
          <label className="space-y-1 text-sm text-zinc-300">
            <span>Multiplier</span>
            <select
              value={formState.multiplier}
              onChange={(event) => setFormState((current) => ({ ...current, multiplier: Number(event.target.value) }))}
              className="fx-select"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-zinc-300 sm:col-span-2">
            <span>Contest URL (optional)</span>
            <input
              value={formState.contest_url}
              onChange={(event) => setFormState((current) => ({ ...current, contest_url: event.target.value }))}
              className="fx-input"
              placeholder="https://www.dream11.com/contest/..."
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isBusy || !selectedSeasonId || !formState.name.trim()}
          className="fx-button-primary mt-4"
        >
          {createdMatchId ? "Recreate Match" : "Create Match"}
        </button>
        {createdMatchId ? (
          <label className="fx-button-soft mt-3 inline-flex cursor-pointer items-center gap-2">
            Upload 1-2 Full Scoreboard Screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => onUploadScoreboard(event.target.files)}
            />
          </label>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500">Season: {activeSeason?.name ?? "None selected"}</p>
      </form>

      {createdMatchId ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white">Score Entry</h3>
          {scoreEntries.length === 0 ? (
            <p className="mt-2 text-sm text-amber-300">
              No players found in this season. Add players from Admin Players, then create the match again.
            </p>
          ) : null}
          <div className="mt-3 space-y-2">
            {scoreEntries.map((entry) => (
              <div key={entry.player_id} className="grid gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 sm:grid-cols-[1fr_140px_140px_140px]">
                <div className="self-center">
                  <p className="text-sm text-zinc-200">{entry.player_name}</p>
                  {ocrConfidence[entry.player_id] !== undefined ? (
                    <p className={`text-[11px] ${ocrConfidence[entry.player_id] < 60 ? "text-amber-300" : "text-zinc-400"}`}>
                      OCR confidence: {ocrConfidence[entry.player_id].toFixed(1)}
                    </p>
                  ) : null}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={entry.raw_points}
                  disabled={entry.source === "absent"}
                  onChange={(event) => updateEntry(entry.player_id, { raw_points: event.target.value, source: "manual" })}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-zinc-100 outline-none focus:border-orange-400"
                  placeholder="Points"
                />
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={entry.source === "absent"}
                    onChange={(event) =>
                      updateEntry(entry.player_id, {
                        source: event.target.checked ? "absent" : "manual",
                        raw_points: event.target.checked ? "0" : entry.raw_points,
                      })
                    }
                  />
                  Mark absent
                </label>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-200 hover:border-orange-400/40">
                  Upload Screenshot
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => onUploadScreenshot(entry.player_id, event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onSaveScores}
            className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-60"
          >
            Save Scores
          </button>
        </div>
      ) : null}

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
