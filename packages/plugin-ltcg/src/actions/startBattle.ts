/**
 * Action: Start a LunchTable story battle.
 *
 * Fetches available chapters, picks the first one, starts a match,
 * and stores the matchId for subsequent actions.
 */

import * as api from "../api.js";

export const startBattleAction = {
  name: "START_LTCG_BATTLE",
  similes: ["PLAY_LTCG", "START_MATCH", "FIGHT_BATTLE", "PLAY_CARD_GAME"],
  description:
    "Start a LunchTable Trading Card Game story battle against the AI opponent",

  validate: async () => {
    if (!api.isConfigured()) return false;
    // Only valid if no active match
    return !api.getCurrentMatch();
  },

  handler: async (
    _runtime: any,
    message: any,
    _state: any,
    _options: any,
    callback?: (response: any) => Promise<void>,
  ) => {
    try {
      // Verify agent is set up
      const me = await api.getMe();

      // Check if agent has a deck — if not, auto-select one
      try {
        const decks = await api.getStarterDecks();
        if (decks && decks.length > 0) {
          // Pick a random starter deck
          const deck = decks[Math.floor(Math.random() * decks.length)];
          await api.selectDeck(deck.deckCode);
        }
      } catch {
        // Already has a deck — that's fine
      }

      // Get first available chapter
      const chapters = await api.getChapters();
      if (!chapters || chapters.length === 0) {
        throw new Error("No story chapters available.");
      }
      const chapter = chapters[0];

      // Start the battle
      const result = await api.startBattle(chapter._id, 1);
      api.setCurrentMatch(result.matchId);

      const text = `Battle started! Playing Chapter "${chapter.title ?? chapter.name ?? "1"}" as ${me.name}. Match: ${result.matchId}`;

      if (callback) {
        await callback({
          text,
          actions: ["START_LTCG_BATTLE"],
          source: message.content?.source,
        });
      }

      return {
        text,
        values: { ltcgMatchId: result.matchId },
        success: true,
      };
    } catch (err: any) {
      const text = `Failed to start battle: ${err.message}`;
      if (callback) {
        await callback({ text, source: message.content?.source });
      }
      return { text, success: false, error: err };
    }
  },

  examples: [
    [
      {
        name: "{{userName}}",
        content: { text: "Play a card game for me" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Starting a LunchTable battle!",
          actions: ["START_LTCG_BATTLE"],
        },
      },
    ],
    [
      {
        name: "{{userName}}",
        content: { text: "Fight a story battle" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "Let me start a story mode battle for you!",
          actions: ["START_LTCG_BATTLE"],
        },
      },
    ],
  ],
};
