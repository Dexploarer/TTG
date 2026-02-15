/**
 * ElizaOS Provider: injects current game state into the agent's LLM context.
 */

import * as api from "./api.js";

export const gameStateProvider = {
  name: "ltcg-game-state",
  description: "Current LunchTable card game state",

  get: async () => {
    const matchId = api.getCurrentMatch();
    if (!matchId) {
      return {
        text: "No active LunchTable match. Use START_LTCG_BATTLE to begin.",
      };
    }

    try {
      const raw = await api.getView(matchId);
      const view = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        text: formatGameState(view, matchId),
        values: { ltcgMatchId: matchId, ltcgView: view },
      };
    } catch (err: any) {
      return { text: `Failed to fetch game state: ${err.message}` };
    }
  },
};

function formatGameState(view: any, matchId: string) {
  if (!view) return "Game state unavailable.";
  if (view.gameOver) return `Game over! Match: ${matchId}`;

  const phase = view.phase ?? "unknown";
  const isMyTurn = view.currentTurnPlayer === "host";
  const myLP = view.players?.host?.lifePoints ?? "?";
  const oppLP = view.players?.away?.lifePoints ?? "?";

  const hand = (view.hand ?? [])
    .map(
      (c: any) =>
        `${c.name} (ATK:${c.attack ?? "-"} DEF:${c.defense ?? "-"} type:${c.cardType ?? "?"} id:${c.instanceId})`,
    )
    .join("\n  ");

  const myMonsters = (view.playerField?.monsters ?? [])
    .filter(Boolean)
    .map(
      (c: any) =>
        `${c.name} ATK:${c.attack} DEF:${c.defense} id:${c.instanceId}`,
    )
    .join("\n  ");

  const oppMonsters = (view.opponentField?.monsters ?? [])
    .filter(Boolean)
    .map((c: any) =>
      c.faceDown
        ? "Face-down monster"
        : `${c.name} ATK:${c.attack} DEF:${c.defense}`,
    )
    .join("\n  ");

  return [
    `=== LTCG MATCH ${matchId} ===`,
    `Phase: ${phase} | ${isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}`,
    `LP: You ${myLP} | Opponent ${oppLP}`,
    ``,
    `Your hand (${view.hand?.length ?? 0}):`,
    `  ${hand || "(empty)"}`,
    ``,
    `Your field:`,
    `  ${myMonsters || "(empty)"}`,
    ``,
    `Opponent field:`,
    `  ${oppMonsters || "(empty)"}`,
  ].join("\n");
}
