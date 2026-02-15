/**
 * HTTP client for the LTCG Agent API.
 *
 * Configured via `configure()` during plugin init.
 * All methods hit the Convex HTTP endpoints at /api/agent/*.
 */

let apiUrl = "";
let apiKey = "";

export function configure(url: string, key: string) {
  // Strip trailing slash
  apiUrl = url.replace(/\/$/, "");
  apiKey = key;
}

export function isConfigured() {
  return !!(apiUrl && apiKey);
}

// ── Current match state (module-level singleton) ─────────────────

let currentMatchId: string | null = null;

export function setCurrentMatch(id: string | null) {
  currentMatchId = id;
}

export function getCurrentMatch() {
  return currentMatchId;
}

// ── HTTP helpers ─────────────────────────────────────────────────

async function request(method: string, path: string, body?: unknown) {
  const url = path.startsWith("http") ? path : `${apiUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

// ── Agent endpoints ──────────────────────────────────────────────

export async function getMe() {
  return request("GET", "/api/agent/me");
}

export async function getChapters() {
  return request("GET", "/api/agent/game/chapters");
}

export async function getStarterDecks() {
  return request("GET", "/api/agent/game/starter-decks");
}

export async function selectDeck(deckCode: string) {
  return request("POST", "/api/agent/game/select-deck", { deckCode });
}

export async function startBattle(chapterId: string, stageNumber?: number) {
  return request("POST", "/api/agent/game/start", { chapterId, stageNumber });
}

export async function submitAction(
  matchId: string,
  command: Record<string, unknown>,
  seat = "host",
) {
  return request("POST", "/api/agent/game/action", {
    matchId,
    command,
    seat,
  });
}

export async function getView(matchId: string, seat = "host") {
  return request(
    "GET",
    `/api/agent/game/view?matchId=${encodeURIComponent(matchId)}&seat=${seat}`,
  );
}
