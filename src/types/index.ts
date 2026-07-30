import type { Tour } from "@/lib/espn";

export type { Tour };

export type PoolStatus =
  | "draft"
  | "open"
  | "locked"
  | "live"
  | "complete"
  | "settling"
  | "settled"
  | "archived";

export type BuyinStatus = "pending" | "confirmed";
export type TournamentStatus = "upcoming" | "in_progress" | "complete";
export type PlayerStatus = "active" | "cut" | "withdrawn" | "disqualified";
export type ScoringMethod = "best_3_of_5" | "best_4_of_5" | "all_5";
export type TotalScoringMethod = "sum_of_rounds" | "best_players_overall";
export type PayoutCategory = "round_1" | "round_2" | "round_3" | "round_4" | "overall";
export type PayoutPlacement = "first" | "second" | "third" | "winner";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_initials: string;
  token_balance: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  external_id: string;
  name: string;
  course: string;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  current_round: number | null;
  cut_line: number | null;
  par: number;
  /** ESPN league slug — must match the tour `external_id` belongs to. */
  tour: Tour;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  external_player_id: string;
  name: string;
  world_ranking: number | null;
  odds: string | null;
  tier: number | null;
  status: PlayerStatus;
  r1_score: number | null;
  r2_score: number | null;
  r3_score: number | null;
  r4_score: number | null;
  total_score: number | null;
}

export interface Pool {
  id: string;
  name: string;
  tournament_id: string;
  organizer_id: string;
  buy_in: number;
  max_entries: number;
  scoring_method: ScoringMethod;
  total_scoring_method: TotalScoringMethod;
  num_tiers: number;
  cut_rule_minimum: number;
  payout_structure: PayoutStructure;
  entry_deadline: string;
  invite_code: string;
  require_buyin_confirmation: boolean;
  is_public: boolean;
  status: PoolStatus;
  total_pot: number;
  created_at: string;
  tournament?: Tournament;
}

export interface PayoutStructure {
  rounds: {
    percentage: number;
    splits: { first: number; second: number; third: number };
  };
  overall: {
    percentage: number;
  };
}

export interface PoolEntry {
  id: string;
  pool_id: string;
  user_id: string;
  picks: Record<string, string> | null;
  tiebreaker: { r1: number | null; r2: number | null; r3: number | null; r4: number | null };
  buyin_status: BuyinStatus;
  picks_locked: boolean;
  is_eligible_weekend: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface PoolResult {
  id: string;
  pool_id: string;
  entry_id: string;
  user_id: string;
  r1_score: number | null;
  r2_score: number | null;
  r3_score: number | null;
  r4_score: number | null;
  total_score: number | null;
  tiebreaker_diff: number | null;
  final_rank: number | null;
  user?: User;
  entry?: PoolEntry;
}

export interface PoolPayout {
  id: string;
  pool_id: string;
  user_id: string;
  category: PayoutCategory;
  placement: PayoutPlacement;
  token_amount: number;
  is_distributed: boolean;
  distributed_at: string | null;
  user?: User;
}

export interface LeaderboardRow {
  rank: number;
  entry_id: string;
  user_id: string;
  display_name: string;
  picks: Array<{ tier: number; player_name: string; r1: number | null; r2: number | null; r3: number | null; r4: number | null; status: string }>;
  r1_score: number | null;
  r2_score: number | null;
  r3_score: number | null;
  r4_score: number | null;
  total_score: number | null;
  is_eligible_weekend: boolean;
  tiebreaker: { r1: number | null; r2: number | null; r3: number | null; r4: number | null };
}
