/** Configuration for NexusProvider. */
export interface NexusConfig {
  /** Base URL for the Nexus API (e.g., "https://api.nexus5v5.com"). */
  apiBaseUrl: string;
  /** Partner API key issued by Nexus admin. */
  apiKey: string;
  /** Optional custom theme overrides. */
  theme?: Partial<NexusTheme>;
}

/** Theming tokens exposed as CSS custom properties. */
export interface NexusTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  fontFamily: string;
  borderRadius: string;
}

/** Champion static data. */
export interface ChampionData {
  id: number;
  name: string;
  iconUrl: string;
}

/** Current state of a draft session. */
export interface DraftState {
  sessionId: string;
  mode: "clash" | "custom" | "scrim";
  status: "in_progress" | "completed" | "abandoned";
  blueBans: ChampionData[];
  redBans: ChampionData[];
  bluePicks: ChampionData[];
  redPicks: ChampionData[];
  currentPhase: string;
  scores: ScoreBreakdown | null;
}

/** Score breakdown for a draft state. */
export interface ScoreBreakdown {
  totalScore: number;
  synergyScore: number;
  counterScore: number;
  comfortScore: number;
}

/** A champion suggestion with score breakdown. */
export interface DraftSuggestion {
  champion: ChampionData;
  compositeScore: number;
  synergy: number;
  counter: number;
  comfort: number;
}

/** Aggregated master profile data. */
export interface MasterProfileData {
  userId: string;
  displayName: string;
  linkedAccounts: LinkedAccount[];
  championPool: ChampionPoolEntry[];
  totalGames: number;
  overallWinRate: number;
  roleDistribution: Record<string, number>;
}

/** A linked Riot account. */
export interface LinkedAccount {
  accountId: string;
  gameName: string;
  tagLine: string;
  region: string;
  verified: boolean;
}

/** Champion pool entry with mastery and comfort scores. */
export interface ChampionPoolEntry {
  champion: ChampionData;
  gamesPlayed: number;
  winRate: number;
  kda: number;
  trueMastery: number;
  comfort: number;
  tier: "S" | "A" | "B" | "C";
}

/** Pairwise synergy data for the heatmap. */
export interface SynergyPair {
  championA: ChampionData;
  championB: ChampionData;
  synergyScore: number;
  gamesPlayed: number;
}
