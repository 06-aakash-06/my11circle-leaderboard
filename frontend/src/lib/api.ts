import { LeaderboardResponse, Match, Season, SeasonDetail } from "@/types/api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

type FetchOptions = RequestInit & {
  next?: { revalidate?: number };
};

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_URL}${normalizedPath}`, {
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
