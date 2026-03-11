// ---- Auth & Identity ----

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface RiotAccount {
  id: string;
  user_id: string;
  puuid: string;
  game_name: string;
  tag_line: string;
  region: string;
  is_primary: boolean;
  verified: boolean;
  verified_at: string | null;
  linked_at: string;
}

export interface MasterProfile {
  user: User;
  accounts: RiotAccount[];
  stats: AggregatedStats;
  champion_pool: ChampionPoolEntry[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LinkAccountRequest {
  game_name: string;
  tag_line: string;
  region: string;
}

// ---- Match ----

export interface MatchSummary {
  match_id: string;
  champion_name: string;
  champion_id: number;
  role: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold_earned: number;
  damage_dealt: number;
  vision_score: number;
  game_duration: number;
  game_start: string;
  queue_id: number;
}

export interface GoldDiffTimeline {
  match_id: string;
  timeline: number[];
}

// ---- Analytics ----

export interface ChampionPoolEntry {
  champion_id: number;
  champion_name: string;
  games_played: number;
  wins: number;
  win_rate: number;
  avg_kda: number;
  avg_cs_per_min: number;
  avg_vision_score: number;
  true_mastery: number;
  comfort_score: number;
  tier: "S" | "A" | "B" | "C";
  last_played: string;
  roles: string[];
}

export interface AggregatedStats {
  total_games: number;
  overall_win_rate: number;
  avg_kda: number;
  avg_cs_per_min: number;
  avg_vision_score: number;
  role_distribution: RoleDistribution[];
  top_champions: ChampionPoolEntry[];
  recent_form: RecentFormPoint[];
}

export interface RoleDistribution {
  role: string;
  games: number;
  percentage: number;
}

export interface RecentFormPoint {
  date: string;
  win_rate: number;
  games: number;
}

export interface PerformanceStats {
  user_id: string;
  stats: AggregatedStats;
}

// ---- Draft ----

export interface DraftSession {
  id: string;
  user_id: string;
  team_id: string | null;
  mode: "clash" | "custom" | "scrim";
  status: "in_progress" | "completed" | "abandoned";
  blue_picks: DraftPick[];
  red_picks: DraftPick[];
  blue_bans: DraftBan[];
  red_bans: DraftBan[];
  current_phase: DraftPhase;
  created_at: string;
}

export interface DraftPick {
  champion_id: number;
  champion_name: string;
  position: number;
  role: string;
}

export interface DraftBan {
  champion_id: number;
  champion_name: string;
  position: number;
}

export type DraftPhase =
  | "ban_phase_1"
  | "pick_phase_1"
  | "ban_phase_2"
  | "pick_phase_2"
  | "completed";

export interface DraftScores {
  synergy_score: number;
  counter_score: number;
  comfort_scores: ComfortEntry[];
  total_score: number;
}

export interface ComfortEntry {
  puuid: string;
  champion_id: number;
  champion_name: string;
  comfort_score: number;
}

export interface ChampionSuggestion {
  champion_id: number;
  champion_name: string;
  composite_score: number;
  synergy_contribution: number;
  counter_contribution: number;
  comfort_contribution: number;
}

export interface DraftPickRequest {
  champion_id: number;
  side: "blue" | "red";
  role: string;
}

export interface DraftBanRequest {
  champion_id: number;
  side: "blue" | "red";
}

// ---- API ----

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    has_more: boolean;
  };
}

// ---- Admin ----

export interface HealthStatus {
  status: string;
  version: string;
  uptime: number;
}

export interface RiotQuotaStatus {
  requests_per_second: number;
  requests_per_two_minutes: number;
  limit_per_second: number;
  limit_per_two_minutes: number;
}
