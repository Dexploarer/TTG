import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { LTCGCards } from "@lunchtable-tcg/cards";
import { LTCGStory } from "@lunchtable-tcg/story";
import { CARD_DEFINITIONS, STARTER_DECKS } from "./cardData";

const cards = new LTCGCards(components.lunchtable_tcg_cards as any);
const story = new LTCGStory(components.lunchtable_tcg_story as any);

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Seed all 132 card definitions
    const cardResult = await cards.seeds.seedCardDefinitions(
      ctx,
      [...CARD_DEFINITIONS] as any[],
    );

    // Seed 6 starter decks
    const deckResult = await cards.seeds.seedStarterDecks(ctx, STARTER_DECKS);

    // Seed story chapters
    const chaptersCount = await story.seeds.seedChapters(ctx, CHAPTERS);

    // Get chapter 1 ID for stages
    const chapters = await story.chapters.getChapters(ctx, {
      status: "published",
    });
    const ch1 = chapters?.find((c: any) => c.chapterNumber === 1);

    let stagesCount = 0;
    if (ch1) {
      stagesCount = await story.seeds.seedStages(
        ctx,
        CHAPTER_1_STAGES(ch1._id),
      );
    }

    return {
      cards: cardResult,
      decks: deckResult,
      chapters: chaptersCount,
      stages: stagesCount,
    };
  },
});

// ── Story Data ────────────────────────────────────────────────────────

const CHAPTERS = [
  {
    actNumber: 1,
    chapterNumber: 1,
    title: "Welcome to the Table",
    description: "Your first day at Lunchtable Academy.",
    archetype: "mixed",
    battleCount: 3,
    status: "published" as const,
    isActive: true,
    unlockRequirements: { minimumLevel: 1 },
    baseRewards: { gold: 50, xp: 25 },
  },
];

const CHAPTER_1_STAGES = (chapterId: string) => [
  {
    chapterId,
    stageNumber: 1,
    name: "First Steps",
    description: "A practice match against the new kid.",
    opponentName: "Training Dummy",
    aiDifficulty: "easy",
    rewardGold: 30,
    rewardXp: 15,
    firstClearBonus: 50,
    status: "published" as const,
  },
  {
    chapterId,
    stageNumber: 2,
    name: "Lunch Rush",
    description: "The cafeteria is buzzing with challengers.",
    opponentName: "Cafeteria Kid",
    aiDifficulty: "easy",
    rewardGold: 40,
    rewardXp: 20,
    firstClearBonus: 75,
    status: "published" as const,
  },
  {
    chapterId,
    stageNumber: 3,
    name: "Hall Monitor Showdown",
    description: "Time to dethrone the hall monitor.",
    opponentName: "Hall Monitor Max",
    aiDifficulty: "medium",
    rewardGold: 60,
    rewardXp: 30,
    firstClearBonus: 100,
    status: "published" as const,
  },
];
