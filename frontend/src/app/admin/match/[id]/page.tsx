"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminNav } from "@/components/admin-nav";
import { MatchDetail, ParseScoreboardResponse, ParseScreenshotResponse, Player } from "@/types/api";

const API_URL = "/api/backend";

type Status = {
  kind: "success" | "error";
  message: string;
};

type EditableScore = {
  score_id?: string;
  player_id: string;
  player_name: string;
  raw_points: string;
  source: "manual" | "absent";
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

export default function AdminEditMatchPage() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<EditableScore[]>([]);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const hasScores = useMemo(() => scores.length > 0, [scores]);

  useEffect(() => {
    async function load() {
      const matchDetail = await requestJson<MatchDetail>(`/matches/${matchId}`);
      const seasonPlayers = await requestJson<Player[]>(`/seasons/${matchDetail.season_id}/players`);

      const scoreByPlayer = new Map(matchDetail.scores.map((score) => [score.player_id, score]));
      const mergedScores: EditableScore[] = seasonPlayers.map((player) => {
        const score = scoreByPlayer.get(player.id);
        return {
          score_id: score?.id,
          player_id: player.id,
          player_name: player.name,
          raw_points: score ? String(score.raw_points) : "",
          source: score?.source === "absent" ? "absent" : "manual",
        };
      });

      setMatch(matchDetail);
      setPlayers(seasonPlayers);
      setScores(mergedScores);
    }

    if (matchId) {
      load().catch((error: Error) => setStatus({ kind: "error", message: `Failed to load match data: ${error.message}` }));
    }
  }, [matchId]);

  function updateScore(playerId: string, updates: Partial<EditableScore>) {
    setScores((current) => current.map((entry) => (entry.player_id === playerId ? { ...entry, ...updates } : entry)));
  }

  async function onUploadScreenshot(playerId: string, file: File | null) {
    if (!matchId || !file) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await requestJson<ParseScreenshotResponse>(`/matches/${matchId}/parse-screenshot`, {
        method: "POST",
        body: formData,
      });

      if (result.score !== null) {
        updateScore(playerId, { raw_points: String(result.score), source: "manual" });
      }
      setOcrConfidence((current) => ({ ...current, [playerId]: result.confidence }));
      setStatus({
        kind: result.score === null ? "error" : "success",
        message:
          result.score === null
            ? "OCR confidence too low. Please verify manually."
            : `OCR detected ${result.score} points (confidence ${result.confidence.toFixed(1)}).`,
      });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    } finally {
      setIsBusy(false);
    }
  }

  async function onUploadScoreboard(files: FileList | null) {
    if (!matchId || !files || files.length === 0) {
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      const formData = new FormData();
      Array.from(files).slice(0, 2).forEach((file) => formData.append("files", file));

      const result = await requestJson<ParseScoreboardResponse>(`/matches/${matchId}/parse-scoreboard`, {
        method: "POST",
        body: formData,
      });

      const scoreByPlayer = new Map(result.matched.map((item) => [item.player_id, item]));
      setScores((current) =>
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

  async function onSaveAll() {
    if (!matchId || !hasScores) {
      return;
    }

    const invalid = scores.find((entry) => entry.source !== "absent" && entry.raw_points.trim() === "");
    if (invalid) {
      setStatus({ kind: "error", message: `Enter score or mark absent for ${invalid.player_name}.` });
      return;
    }

    setIsBusy(true);
    setStatus(null);
    try {
      await requestJson<{ success: boolean; saved_count: number }>(`/matches/${matchId}/save-scores`, {
        method: "POST",
        body: JSON.stringify({
          scores: scores.map((entry) => ({
            player_id: entry.player_id,
            raw_points: entry.source === "absent" ? 0 : Number(entry.raw_points),
            source: entry.source,
          })),
        }),
      });
      setStatus({ kind: "success", message: "Scores updated successfully." });
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
        <h2 className="text-xl font-semibold text-white">Edit Match Scores</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {match ? `${match.name} - ${new Date(match.match_date).toLocaleDateString()}` : "Loading match..."}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">Players: {players.length}</h3>
          <label className="fx-button-soft inline-flex cursor-pointer items-center gap-2">
            Upload 1-2 Full Scoreboard Screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => onUploadScoreboard(event.target.files)}
            />
          </label>
        </div>
        {players.length === 0 ? (
          <p className="mt-2 text-sm text-amber-300">
            No players found for this season. Add players first from Admin Players, then return to add scores.
          </p>
        ) : null}
        <div className="mt-3 space-y-2">
          {scores.map((entry) => (
            <div key={entry.player_id} className="grid gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 sm:grid-cols-[1fr_130px_130px_140px]">
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
                disabled={entry.source === "absent"}
                value={entry.raw_points}
                onChange={(event) => updateScore(entry.player_id, { raw_points: event.target.value, source: "manual" })}
                className="fx-input px-2 py-1"
              />
              <select
                value={entry.source}
                onChange={(event) => {
                  const source = event.target.value as EditableScore["source"];
                  updateScore(entry.player_id, {
                    source,
                    raw_points: source === "absent" ? "0" : entry.raw_points,
                  });
                }}
                className="fx-select px-2 py-1"
              >
                <option value="manual">manual</option>
                <option value="absent">absent</option>
              </select>
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
          disabled={isBusy || !hasScores}
          onClick={onSaveAll}
          className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-60"
        >
          Save Updates
        </button>
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
