export type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
};

export type LeaderboardRow = {
  player_id: string;
  player_name: string;
  total_points: number;
  rank: number;
  rank_change: number;
  last_match_points: number | null;
  is_mvp: boolean;
};

export type LeaderboardResponse = {
  season_id: string;
  latest_match_name: string | null;
  latest_match_date: string | null;
  pending_players: string[];
  rows: LeaderboardRow[];
};

export type Player = {
  id: string;
  season_id: string;
  name: string;
  created_at: string | null;
};

export type SeasonDetail = Season & {
  players: Player[];
  match_count: number;
};

export type Match = {
  id: string;
  season_id: string;
  name: string;
  match_date: string;
  contest_url: string | null;
  multiplier: number;
  is_complete: boolean;
  created_at: string | null;
};

export type MatchScore = {
  id: string;
  player_id: string;
  player_name: string;
  raw_points: number;
  multiplied_points: number;
  source: "scraped" | "manual" | "absent";
};

export type MatchDetail = Match & {
  scores: MatchScore[];
};

export type ParseScreenshotResponse = {
  score: number | null;
  confidence: number;
};

export type ParseScoreboardResponse = {
  matched: Array<{
    player_id: string;
    player_name: string;
    extracted_name: string;
    score: number;
    confidence: number;
  }>;
  unmatched_aliases: string[];
  unmatched_players: string[];
};
