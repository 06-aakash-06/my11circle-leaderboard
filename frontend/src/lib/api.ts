import { LeaderboardResponse, Match, Season, SeasonDetail } from "@/types/api";

/**
 * Server-side: use full backend URL (for server components making direct requests).
 * Client-side: use /api/backend proxy (rewrites forward to Render, cookies stay same-domain).
 */
const API_URL_SERVER = (process.env.BACKEND_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");
const API_URL_CLIENT = "/api/backend";

function getApiUrl(): string {
  return typeof window === "undefined" ? API_URL_SERVER : API_URL_CLIENT;
}

type FetchOptions = RequestInit & {
  next?: { revalidate?: number };
};

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const base = getApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${base}${normalizedPath}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSeasons(options?: FetchOptions): Promise<Season[]> {
  return apiFetch<Season[]>("/seasons", options);
}

export async function getLeaderboard(seasonId: string, options?: FetchOptions): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/seasons/${seasonId}/leaderboard`, options);
}

export async function getSeasonDetail(seasonId: string, options?: FetchOptions): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/seasons/${seasonId}`, options);
}

export async function getMatches(seasonId: string, options?: FetchOptions): Promise<Match[]> {
  return apiFetch<Match[]>(`/seasons/${seasonId}/matches`, options);
}
