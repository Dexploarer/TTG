/**
 * Action: Check the current LunchTable game status.
 *
 * Reports LP, field state, hand, and phase.
 * If no active match, reports that.
 */

import * as api from "../api.js";

export const getStatusAction = {
  name: "CHECK_LTCG_STATUS",
  similes: ["GAME_STATUS", "CHECK_MATCH", "LTCG_STATUS"],
  description:
    "Check the current status of an active LunchTable match — LP, field, hand",

  validate: async () => {
    return api.isConfigured();
  },

  handler: async (
    _runtime: any,
    message: any,
    _state: any,
    _options: any,
    callback?: (response: any) => Promise<void>,
  ) => {
    const matchId = api.getCurrentMatch();
    if (!matchId) {
      const text = "No active LunchTable match.";
      if (callback) await callback({ text, source: message.content?.source });
      return { text, success: true };
    }

    try {
      const raw = await api.getView(matchId);
      const view = typeof raw === "string" ? JSON.parse(raw) : raw;

      if (view?.gameOver) {
        api.setCurrentMatch(null);
        const myLP = view?.players?.host?.lifePoints ?? 0;
        const oppLP = view?.players?.away?.lifePoints ?? 0;
        const text = `Game over! Final LP: You ${myLP} — Opponent ${oppLP}. ${myLP > oppLP ? "Victory!" : "Defeat."}`;
        if (callback)
          await callback({ text, source: message.content?.source });
        return { text, success: true };
      }

      const phase = view?.phase ?? "?";
      const isMyTurn = view?.currentTurnPlayer === "host";
      const myLP = view?.players?.host?.lifePoints ?? "?";
      const oppLP = view?.players?.away?.lifePoints ?? "?";
      const handCount = view?.hand?.length ?? 0;
      const myMonsters = (view?.playerField?.monsters ?? []).filter(
        Boolean,
      ).length;
      const oppMonsters = (view?.opponentField?.monsters ?? []).filter(
        Boolean,
      ).length;

      const text = [
        `Match: ${matchId}`,
        `Phase: ${phase} — ${isMyTurn ? "Your turn" : "Opponent's turn"}`,
        `LP: You ${myLP} / Opponent ${oppLP}`,
        `Hand: ${handCount} cards | Your monsters: ${myMonsters} | Opponent monsters: ${oppMonsters}`,
      ].join("\n");

      if (callback) await callback({ text, source: message.content?.source });
      return { text, values: { ltcgMatchId: matchId }, success: true };
    } catch (err: any) {
      const text = `Failed to get status: ${err.message}`;
      if (callback) await callback({ text, source: message.content?.source });
      return { text, success: false, error: err };
    }
  },

  examples: [
    [
      {
        name: "{{userName}}",
        content: { text: "How's the game going?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Let me check the match status...",
          actions: ["CHECK_LTCG_STATUS"],
        },
      },
    ],
  ],
};
