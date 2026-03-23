import type {
  AnalyzeDraftRequest,
  AnalyzeDraftResponse,
  AuthTokens,
  ChampionPoolResponse,
  ChampionSuggestion,
  DraftBanRequest,
  DraftPickRequest,
  DraftScores,
  DraftSession,
  DuoOverlapResponse,
  GoldDiffTimeline,
  HealthStatus,
  LinkAccountRequest,
  LoginRequest,
  MasterProfile,
  MatchDetailResponse,
  MatchSummary,
  PaginatedResponse,
  PerformanceStats,
  PublicSummonerProfile,
  RankedDataResponse,
  RegisterRequest,
  RiotAccount,
  RiotQuotaStatus,
} from "@/types";

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("nexus_access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Check if this is actually an auth error from our backend
      const body = await response.json().catch(() => null);
      const isAuthError = body?.error?.code === "AUTH_ERROR";

      if (isAuthError) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry with new token
          const retryHeaders: Record<string, string> = {
            ...headers,
            Authorization: `Bearer ${localStorage.getItem("nexus_access_token")}`,
          };
          const retryResponse = await fetch(path, { ...options, headers: retryHeaders });
          if (!retryResponse.ok) {
            const errorBody = await retryResponse.json().catch(() => null);
            const message =
              errorBody?.error?.message || `Request failed: ${retryResponse.status}`;
            throw new ApiError(retryResponse.status, message, errorBody?.error?.code);
          }
          if (retryResponse.status === 204) {
            return undefined as T;
          }
          return retryResponse.json();
        }
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("nexus_access_token");
          localStorage.removeItem("nexus_refresh_token");
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired");
      }

      // Non-auth 401 (e.g., upstream error) — treat as a normal error
      const message = body?.error?.message || `Request failed: ${response.status}`;
      throw new ApiError(response.status, message, body?.error?.code);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message =
        errorBody?.error?.message || `Request failed: ${response.status}`;
      throw new ApiError(response.status, message, errorBody?.error?.code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const refreshToken = localStorage.getItem("nexus_refresh_token");
    if (!refreshToken) return false;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;

      const data: AuthTokens = await response.json();
      localStorage.setItem("nexus_access_token", data.access_token);
      localStorage.setItem("nexus_refresh_token", data.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  // ---- Auth ----

  async register(data: RegisterRequest): Promise<AuthTokens> {
    return this.request<AuthTokens>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthTokens> {
    return this.request<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(refreshToken?: string): Promise<void> {
    return this.request<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken ?? "" }),
    });
  }

  // ---- Identity ----

  async getMe(): Promise<MasterProfile> {
    return this.request<MasterProfile>("/api/identity/me");
  }

  async getProfile(userId: string): Promise<MasterProfile> {
    return this.request<MasterProfile>(`/api/identity/profile/${userId}`);
  }

  async linkAccount(data: LinkAccountRequest): Promise<RiotAccount> {
    return this.request<RiotAccount>("/api/identity/link", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async unlinkAccount(accountId: string): Promise<void> {
    return this.request<void>(`/api/identity/link/${accountId}`, {
      method: "DELETE",
    });
  }

  async verifyAccount(accountId: string): Promise<RiotAccount> {
    return this.request<RiotAccount>(`/api/identity/verify/${accountId}`, {
      method: "POST",
    });
  }

  // ---- Match ----

  async triggerIngestion(
    puuid: string,
    options?: { region?: string; count?: number }
  ): Promise<{ job_id: string; error?: string }> {
    return this.request<{ job_id: string; error?: string }>(
      `/api/match/ingest/${puuid}`,
      {
        method: "POST",
        body: JSON.stringify({
          region: options?.region ?? "na1",
          count: options?.count ?? 10,
        }),
      }
    );
  }

  async getIngestionStatus(
    jobId: string
  ): Promise<{ job_id: string; status: string; matches_fetched?: number; matches_inserted?: number; error?: string }> {
    return this.request(`/api/match/ingest/status/${jobId}`);
  }

  async getMatchHistory(
    puuid: string,
    cursor?: string,
    queue?: number,
    champion?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaginatedResponse<MatchSummary>> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (queue !== undefined) params.set("queue", queue.toString());
    if (champion) params.set("champion", champion);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const qs = params.toString();
    return this.request<PaginatedResponse<MatchSummary>>(
      `/api/match/history/${puuid}${qs ? `?${qs}` : ""}`
    );
  }

  async getMatchDetail(matchId: string): Promise<MatchDetailResponse> {
    return this.request<MatchDetailResponse>(
      `/api/match/detail/${matchId}`
    );
  }

  // ---- Analytics ----

  async getChampionPool(userId: string): Promise<ChampionPoolResponse> {
    return this.request<ChampionPoolResponse>(
      `/api/analytics/champion-pool/${userId}`
    );
  }

  async getPerformance(userId: string): Promise<PerformanceStats> {
    return this.request<PerformanceStats>(
      `/api/analytics/performance/${userId}`
    );
  }

  async getGoldDiff(matchId: string): Promise<GoldDiffTimeline> {
    return this.request<GoldDiffTimeline>(
      `/api/analytics/gold-diff/${matchId}`
    );
  }

  // ---- Public Summoner Lookup ----

  async lookupSummoner(
    region: string,
    gameName: string,
    tagLine: string
  ): Promise<PublicSummonerProfile> {
    return this.request<PublicSummonerProfile>(
      `/api/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );
  }

  async getRankedData(
    region: string,
    gameName: string,
    tagLine: string
  ): Promise<RankedDataResponse> {
    return this.request<RankedDataResponse>(
      `/api/summoner/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}/ranked`
    );
  }

  async getSummonerChampionPool(puuid: string): Promise<ChampionPoolResponse> {
    return this.request<ChampionPoolResponse>(
      `/api/analytics/champion-pool-by-puuid/${puuid}`
    );
  }

  async getSummonerPerformance(puuid: string): Promise<PerformanceStats> {
    return this.request<PerformanceStats>(
      `/api/analytics/performance-by-puuid/${puuid}`
    );
  }

  async getSummonerMatches(
    puuid: string,
    cursor?: string,
    queue?: number,
    champion?: string,
    startDate?: string,
    endDate?: string
  ): Promise<PaginatedResponse<MatchSummary>> {
    return this.getMatchHistory(puuid, cursor, queue, champion, startDate, endDate);
  }

  // ---- Duo Overlap ----

  async getDuoOverlap(puuid1: string, puuid2: string): Promise<DuoOverlapResponse> {
    return this.request<DuoOverlapResponse>(
      `/api/analytics/duo-overlap/${encodeURIComponent(puuid1)}/${encodeURIComponent(puuid2)}`
    );
  }

  // ---- Draft ----

  async createDraftSession(
    mode: "clash" | "custom" | "scrim",
    teamId?: string
  ): Promise<DraftSession> {
    return this.request<DraftSession>("/api/draft/session", {
      method: "POST",
      body: JSON.stringify({ mode, team_id: teamId }),
    });
  }

  async addPick(
    sessionId: string,
    data: DraftPickRequest
  ): Promise<DraftSession> {
    return this.request<DraftSession>(
      `/api/draft/session/${sessionId}/pick`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  async addBan(
    sessionId: string,
    data: DraftBanRequest
  ): Promise<DraftSession> {
    return this.request<DraftSession>(
      `/api/draft/session/${sessionId}/ban`,
      { method: "PUT", body: JSON.stringify(data) }
    );
  }

  async getDraftScores(sessionId: string): Promise<DraftScores> {
    return this.request<DraftScores>(
      `/api/draft/session/${sessionId}/scores`
    );
  }

  async getDraftSuggestions(
    sessionId: string
  ): Promise<ChampionSuggestion[]> {
    return this.request<ChampionSuggestion[]>(
      `/api/draft/suggestions/${sessionId}`
    );
  }

  async analyzeDraft(data: AnalyzeDraftRequest): Promise<AnalyzeDraftResponse> {
    return this.request<AnalyzeDraftResponse>("/api/draft/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ---- Admin ----

  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>("/api/admin/health");
  }

  async getRiotQuota(): Promise<RiotQuotaStatus> {
    return this.request<RiotQuotaStatus>("/api/admin/riot-quota");
  }

  async getLatestPatch(): Promise<{ patch: string }> {
    return this.request<{ patch: string }>("/api/admin/latest-patch");
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = new ApiClient();
