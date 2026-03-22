import type {
  DraftState,
  DraftSuggestion,
  MasterProfileData,
  ScoreBreakdown,
  SynergyPair,
} from "../types";

export class NexusAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Nexus-Api-Key": this.apiKey,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new NexusAPIError(response.status, body);
    }

    return response.json() as Promise<T>;
  }

  // --- Profile ---

  async getProfile(userId: string): Promise<MasterProfileData> {
    return this.request<MasterProfileData>(
      `/api/v1/widgets/profile/${userId}`,
    );
  }

  // --- Draft ---

  async createDraftSession(
    mode: "clash" | "custom" | "scrim" = "clash",
  ): Promise<{ session_id: string }> {
    return this.request<{ session_id: string }>(
      "/api/v1/draft/session",
      { method: "POST", body: JSON.stringify({ mode }) },
    );
  }

  async getDraftScores(sessionId: string): Promise<ScoreBreakdown> {
    return this.request<ScoreBreakdown>(
      `/api/v1/widgets/draft/scores/${sessionId}`,
    );
  }

  async getDraftSuggestions(sessionId: string): Promise<DraftSuggestion[]> {
    return this.request<DraftSuggestion[]>(
      `/api/v1/draft/suggestions/${sessionId}`,
    );
  }

  async registerPick(
    sessionId: string,
    championId: number,
    position: string,
  ): Promise<DraftState> {
    return this.request<DraftState>(
      `/api/v1/draft/session/${sessionId}/pick`,
      {
        method: "PUT",
        body: JSON.stringify({ champion_id: championId, position }),
      },
    );
  }

  async registerBan(
    sessionId: string,
    championId: number,
  ): Promise<DraftState> {
    return this.request<DraftState>(
      `/api/v1/draft/session/${sessionId}/ban`,
      {
        method: "PUT",
        body: JSON.stringify({ champion_id: championId }),
      },
    );
  }

  // --- Synergy ---

  async getSynergyData(championIds: number[]): Promise<SynergyPair[]> {
    const params = championIds.map((id) => `champions=${id}`).join("&");
    return this.request<SynergyPair[]>(
      `/api/v1/widgets/synergy?${params}`,
    );
  }
}

export class NexusAPIError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Nexus API error ${status}: ${body}`);
    this.name = "NexusAPIError";
    this.status = status;
    this.body = body;
  }
}
