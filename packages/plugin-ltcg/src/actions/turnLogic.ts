/**
 * Shared turn-playing logic used by both PLAY_LTCG_TURN and PLAY_LTCG_STORY.
 *
 * Plays one full turn:
 * 1. Main phase — summon strongest monster, activate a spell
 * 2. Advance to combat
 * 3. Combat — attack with each monster
 * 4. End turn
 */

import { getClient } from "../client.js";
import type { BoardCard, CardInHand, PlayerView } from "../types.js";

/**
 * Play one full turn. Returns actions taken as strings for logging.
 */
export async function playOneTurn(
  matchId: string,
  view: PlayerView,
): Promise<string[]> {
  const client = getClient();
  const actions: string[] = [];

  // ── Main phase: summon + spells ────────────────────────────
  if (view.phase === "main" || view.phase === "main2") {
    const monsters = view.hand
      .filter(
        (c): c is CardInHand & { attack: number } =>
          c.cardType === "stereotype" && c.attack !== undefined,
      )
      .sort((a, b) => b.attack - a.attack);

    for (const card of monsters) {
      try {
        await client.submitAction(matchId, {
          type: "SUMMON",
          cardInstanceId: card.instanceId,
          position: "attack",
        });
        actions.push(`Summoned ${card.name} (ATK ${card.attack})`);
        break; // One normal summon per turn
      } catch {
        continue; // Field full, tributes needed, etc.
      }
    }

    const spells = view.hand.filter((c) => c.cardType === "spell");
    for (const spell of spells) {
      try {
        await client.submitAction(matchId, {
          type: "ACTIVATE_SPELL",
          cardInstanceId: spell.instanceId,
        });
        actions.push(`Activated ${spell.name}`);
        break;
      } catch {
        continue;
      }
    }
  }

  // ── Advance to combat ──────────────────────────────────────
  try {
    await client.submitAction(matchId, { type: "ADVANCE_PHASE" });
  } catch {
    // Already past main or can't advance
  }

  // Refresh state after phase change
  const combatView = await client.getView(matchId);

  // ── Combat: attack with each monster ───────────────────────
  if (combatView.phase === "combat") {
    const myMonsters = (combatView.playerField?.monsters ?? []).filter(
      Boolean,
    ) as BoardCard[];
    const oppMonsters = (combatView.opponentField?.monsters ?? []).filter(
      Boolean,
    ) as BoardCard[];
    const faceUpTarget = oppMonsters.find((m) => !m.faceDown);

    for (const mon of myMonsters) {
      try {
        await client.submitAction(matchId, {
          type: "DECLARE_ATTACK",
          attackerInstanceId: mon.instanceId,
          targetInstanceId: faceUpTarget?.instanceId,
        });
        if (faceUpTarget) {
          actions.push(`${mon.name} attacked ${faceUpTarget.name}`);
        } else {
          actions.push(`${mon.name} attacked directly`);
        }
      } catch {
        // Already attacked, can't attack, etc.
      }
    }
  }

  // ── End turn ───────────────────────────────────────────────
  try {
    await client.submitAction(matchId, { type: "END_TURN" });
    actions.push("Ended turn");
  } catch {
    try {
      await client.submitAction(matchId, { type: "ADVANCE_PHASE" });
      await client.submitAction(matchId, { type: "END_TURN" });
      actions.push("Ended turn");
    } catch {
      actions.push("Could not end turn");
    }
  }

  return actions;
}

/** Format a game-over summary from the final view */
export function gameOverSummary(view: PlayerView): string {
  const myLP = view.players.host.lifePoints;
  const oppLP = view.players.away.lifePoints;
  if (myLP > oppLP)
    return `VICTORY! (You: ${myLP} LP — Opponent: ${oppLP} LP)`;
  if (myLP < oppLP)
    return `DEFEAT. (You: ${myLP} LP — Opponent: ${oppLP} LP)`;
  return `DRAW. (Both: ${myLP} LP)`;
}
