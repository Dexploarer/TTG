/**
 * Action: Auto-play one full turn in a LunchTable match.
 *
 * Logic:
 * 1. Get current game state
 * 2. In main phase: summon the highest-ATK monster from hand
 * 3. Advance to combat
 * 4. In combat: attack with each monster on field
 * 5. End turn
 *
 * Each step catches errors silently — invalid commands are skipped.
 */

import * as api from "../api.js";

export const playTurnAction = {
  name: "PLAY_LTCG_TURN",
  similes: ["TAKE_TURN", "PLAY_CARDS", "MAKE_MOVE"],
  description:
    "Play a full turn in the active LunchTable match — summon, attack, and end turn",

  validate: async () => {
    return api.isConfigured() && !!api.getCurrentMatch();
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
      const text = "No active match. Use START_LTCG_BATTLE first.";
      if (callback) await callback({ text, source: message.content?.source });
      return { text, success: false };
    }

    try {
      const result = await autoPlayTurn(matchId);

      if (callback) {
        await callback({
          text: result.summary,
          actions: ["PLAY_LTCG_TURN"],
          source: message.content?.source,
        });
      }

      // If game is over, clear the match
      if (result.gameOver) {
        api.setCurrentMatch(null);
      }

      return {
        text: result.summary,
        values: { ltcgMatchId: result.gameOver ? null : matchId },
        success: true,
      };
    } catch (err: any) {
      const text = `Turn failed: ${err.message}`;
      if (callback) await callback({ text, source: message.content?.source });
      return { text, success: false, error: err };
    }
  },

  examples: [
    [
      {
        name: "{{userName}}",
        content: { text: "Play your turn" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Playing my turn now...",
          actions: ["PLAY_LTCG_TURN"],
        },
      },
    ],
  ],
};

// ── Auto-play logic ──────────────────────────────────────────────

async function autoPlayTurn(matchId: string) {
  const actions: string[] = [];

  let raw = await api.getView(matchId);
  let view = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (view?.gameOver) {
    return { summary: "Game is already over.", gameOver: true };
  }

  if (view?.currentTurnPlayer !== "host") {
    return {
      summary: "Waiting — it's the opponent's turn.",
      gameOver: false,
    };
  }

  // Main phase: summon strongest monster from hand
  if (view?.phase === "main" || view?.phase === "main2") {
    const hand = (view.hand ?? []).filter(
      (c: any) => c.cardType === "stereotype" && c.attack !== undefined,
    );

    // Sort by ATK descending
    hand.sort((a: any, b: any) => (b.attack ?? 0) - (a.attack ?? 0));

    for (const card of hand) {
      try {
        await api.submitAction(matchId, {
          type: "SUMMON",
          cardInstanceId: card.instanceId,
          position: "attack",
        });
        actions.push(`Summoned ${card.name} (ATK ${card.attack})`);
        break; // One normal summon per turn
      } catch {
        // Can't summon (field full, level too high, etc.) — try next
      }
    }

    // Try to activate spells from hand
    const spells = (view.hand ?? []).filter(
      (c: any) => c.cardType === "spell",
    );
    for (const spell of spells) {
      try {
        await api.submitAction(matchId, {
          type: "ACTIVATE_SPELL",
          cardInstanceId: spell.instanceId,
        });
        actions.push(`Activated ${spell.name}`);
        break; // One spell per turn for simplicity
      } catch {
        // Can't activate — skip
      }
    }
  }

  // Advance to combat
  try {
    await api.submitAction(matchId, { type: "ADVANCE_PHASE" });
    actions.push("Advanced phase");
  } catch {
    // Already past main or can't advance
  }

  // Refresh state after phase change
  raw = await api.getView(matchId);
  view = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Combat: attack with each monster
  if (view?.phase === "combat") {
    const myMonsters = (view.playerField?.monsters ?? []).filter(Boolean);
    const oppMonsters = (view.opponentField?.monsters ?? []).filter(Boolean);

    for (const mon of myMonsters) {
      try {
        if (oppMonsters.length > 0 && !oppMonsters[0].faceDown) {
          // Attack the first opponent monster
          await api.submitAction(matchId, {
            type: "DECLARE_ATTACK",
            attackerInstanceId: mon.instanceId,
            targetInstanceId: oppMonsters[0].instanceId,
          });
          actions.push(`${mon.name} attacks ${oppMonsters[0].name}`);
        } else {
          // Direct attack
          await api.submitAction(matchId, {
            type: "DECLARE_ATTACK",
            attackerInstanceId: mon.instanceId,
          });
          actions.push(`${mon.name} attacks directly!`);
        }
      } catch {
        // Can't attack (already attacked, etc.)
      }
    }
  }

  // End turn
  try {
    await api.submitAction(matchId, { type: "END_TURN" });
    actions.push("Ended turn");
  } catch {
    // Try advancing phase first
    try {
      await api.submitAction(matchId, { type: "ADVANCE_PHASE" });
      await api.submitAction(matchId, { type: "END_TURN" });
      actions.push("Ended turn");
    } catch {
      // Stuck — report what we did
    }
  }

  // Check if game ended
  raw = await api.getView(matchId);
  view = typeof raw === "string" ? JSON.parse(raw) : raw;
  const gameOver = !!view?.gameOver;

  if (gameOver) {
    const myLP = view?.players?.host?.lifePoints ?? 0;
    const oppLP = view?.players?.away?.lifePoints ?? 0;
    const won = myLP > oppLP;
    actions.push(won ? "VICTORY!" : "DEFEAT.");
  }

  return {
    summary:
      actions.length > 0 ? actions.join(". ") + "." : "No actions taken.",
    gameOver,
  };
}
