/**
 * @lunchtable-tcg/plugin-ltcg
 *
 * ElizaOS plugin for playing LunchTable Trading Card Game battles.
 *
 * Required env vars:
 *   LTCG_API_URL — Convex deployment URL (e.g. https://your-app.convex.site)
 *   LTCG_API_KEY — Agent API key from registration (starts with ltcg_)
 *
 * Actions:
 *   START_LTCG_BATTLE — Start a story mode battle
 *   PLAY_LTCG_TURN    — Auto-play one turn (summon, attack, end turn)
 *   CHECK_LTCG_STATUS — Check current match state
 *
 * Provider:
 *   ltcg-game-state — Injects current game state into agent context
 */

import * as api from "./api.js";
import { gameStateProvider } from "./gameState.js";
import { startBattleAction } from "./actions/startBattle.js";
import { playTurnAction } from "./actions/playTurn.js";
import { getStatusAction } from "./actions/getStatus.js";

const plugin = {
  name: "@lunchtable-tcg/plugin-ltcg",
  description:
    "Play LunchTable Trading Card Game battles via the agent HTTP API",

  init: async (config: Record<string, string>) => {
    const apiUrl =
      config?.LTCG_API_URL || process.env.LTCG_API_URL || "";
    const apiKey =
      config?.LTCG_API_KEY || process.env.LTCG_API_KEY || "";

    if (!apiUrl) {
      throw new Error(
        "LTCG_API_URL is required. Set it in plugin config or environment.",
      );
    }
    if (!apiKey) {
      throw new Error(
        "LTCG_API_KEY is required. Register at /api/agent/register to get one.",
      );
    }
    if (!apiKey.startsWith("ltcg_")) {
      throw new Error(
        "LTCG_API_KEY must start with 'ltcg_'. Check your API key.",
      );
    }

    api.configure(apiUrl, apiKey);

    // Verify the key works
    try {
      const me = await api.getMe();
      console.log(
        `[LTCG] Agent "${me.name}" connected (${me.apiKeyPrefix})`,
      );
    } catch (err: any) {
      throw new Error(`LTCG auth failed: ${err.message}`);
    }
  },

  providers: [gameStateProvider],

  actions: [startBattleAction, playTurnAction, getStatusAction],
};

export default plugin;
