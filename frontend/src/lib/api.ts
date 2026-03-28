import { LeaderboardResponse, Match, Season, SeasonDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type FetchOptions = RequestInit & {
  next?: { revalidate?: number };
};

async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
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

export async function getSeasons(): Promise<Season[]> {
  return apiFetch<Season[]>("/seasons");
}

export async function getLeaderboard(seasonId: string): Promise<LeaderboardResponse> {
  return apiFetch<LeaderboardResponse>(`/seasons/${seasonId}/leaderboard`);
}

export async function getSeasonDetail(seasonId: string): Promise<SeasonDetail> {
  return apiFetch<SeasonDetail>(`/seasons/${seasonId}`);
}

export async function getMatches(seasonId: string): Promise<Match[]> {
  return apiFetch<Match[]>(`/seasons/${seasonId}/matches`);
}
