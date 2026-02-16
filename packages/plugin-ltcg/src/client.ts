/**
 * HTTP client for the LTCG Agent API.
 *
 * Encapsulates all communication with the Convex HTTP endpoints at /api/agent/*.
 * Initialized during plugin init, accessed via getClient().
 */

import type {
  AgentInfo,
  Chapter,
  GameCommand,
  MatchStatus,
  PlayerView,
  StageCompletionResult,
  StageData,
  StarterDeck,
  StoryProgress,
} from "./types.js";

// ── Error class ──────────────────────────────────────────────────

export class LTCGApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = "LTCGApiError";
  }
}

// ── Client class ─────────────────────────────────────────────────

export class LTCGClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private matchId: string | null = null;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  // ── Match state ──────────────────────────────────────────────

  get currentMatchId(): string | null {
    return this.matchId;
  }

  get hasActiveMatch(): boolean {
    return this.matchId !== null;
  }

  setMatch(id: string | null): void {
    this.matchId = id;
  }

  // ── Agent endpoints ──────────────────────────────────────────

  /** GET /api/agent/me — verify credentials, get agent info */
  async getMe(): Promise<AgentInfo> {
    return this.get("/api/agent/me");
  }

  /** GET /api/agent/game/chapters — list story chapters */
  async getChapters(): Promise<Chapter[]> {
    return this.get("/api/agent/game/chapters");
  }

  /** GET /api/agent/game/starter-decks — list available decks */
  async getStarterDecks(): Promise<StarterDeck[]> {
    return this.get("/api/agent/game/starter-decks");
  }

  /** POST /api/agent/game/select-deck — choose a starter deck */
  async selectDeck(deckCode: string): Promise<unknown> {
    return this.post("/api/agent/game/select-deck", { deckCode });
  }

  /** POST /api/agent/game/start — start a story battle */
  async startBattle(
    chapterId: string,
    stageNumber?: number,
  ): Promise<{ matchId: string }> {
    return this.post("/api/agent/game/start", { chapterId, stageNumber });
  }

  /** POST /api/agent/game/action — submit a game command */
  async submitAction(
    matchId: string,
    command: GameCommand,
    seat: "host" | "away" = "host",
  ): Promise<unknown> {
    return this.post("/api/agent/game/action", { matchId, command, seat });
  }

  /** GET /api/agent/game/view — get player's view of game state */
  async getView(
    matchId: string,
    seat: "host" | "away" = "host",
  ): Promise<PlayerView> {
    const qs = `matchId=${encodeURIComponent(matchId)}&seat=${seat}`;
    return this.get(`/api/agent/game/view?${qs}`);
  }

  /** GET /api/agent/game/match-status — get match metadata */
  async getMatchStatus(matchId: string): Promise<MatchStatus> {
    const qs = `matchId=${encodeURIComponent(matchId)}`;
    return this.get(`/api/agent/game/match-status?${qs}`);
  }

  // ── Story endpoints ────────────────────────────────────────────

  /** GET /api/agent/story/progress — get full story progress */
  async getStoryProgress(): Promise<StoryProgress> {
    return this.get("/api/agent/story/progress");
  }

  /** GET /api/agent/story/stage — get stage data with narrative */
  async getStage(chapterId: string, stageNumber: number): Promise<StageData> {
    const qs = `chapterId=${encodeURIComponent(chapterId)}&stageNumber=${stageNumber}`;
    return this.get(`/api/agent/story/stage?${qs}`);
  }

  /** POST /api/agent/story/complete-stage — finalize a completed stage */
  async completeStage(matchId: string): Promise<StageCompletionResult> {
    return this.post("/api/agent/story/complete-stage", { matchId });
  }

  // ── HTTP helpers ─────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request("POST", path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new LTCGApiError(
        data.error ?? `HTTP ${res.status}`,
        res.status,
        `${method} ${path.split("?")[0]}`,
      );
    }

    return data as T;
  }
}

// ── Module-level singleton ───────────────────────────────────────

let _client: LTCGClient | null = null;

/** Initialize the client during plugin init. */
export function initClient(apiUrl: string, apiKey: string): LTCGClient {
  _client = new LTCGClient(apiUrl, apiKey);
  return _client;
}

/** Get the initialized client. Throws if init hasn't been called. */
export function getClient(): LTCGClient {
  if (!_client) {
    throw new Error(
      "LTCG client not initialized. Plugin init() must run first.",
    );
  }
  return _client;
}
