import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    users: defineTable({
      privyId: v.string(),
      username: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      // String ID referencing a userDecks doc in the cards component.
      // Stored as string because host schema can't reference component table types.
      activeDeckId: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_privyId", ["privyId"])
      .index("by_username", ["username"]),

    agents: defineTable({
      name: v.string(),
      apiKeyHash: v.string(),
      apiKeyPrefix: v.string(),
      userId: v.id("users"),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_apiKeyHash", ["apiKeyHash"])
      .index("by_userId", ["userId"]),

    // Links match component matches to story context.
    // The match component schema is strict, so story metadata lives here.
    storyMatches: defineTable({
      matchId: v.string(),
      userId: v.string(),
      chapterId: v.string(),
      stageNumber: v.number(),
      stageId: v.string(),
      outcome: v.optional(
        v.union(v.literal("won"), v.literal("lost"), v.literal("abandoned")),
      ),
      starsEarned: v.optional(v.number()),
      rewardsGold: v.optional(v.number()),
      rewardsXp: v.optional(v.number()),
      firstClearBonus: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    })
      .index("by_matchId", ["matchId"])
      .index("by_userId", ["userId"]),

    // Singleton — tracks current position in the 16-week campaign.
    // One row. Created by seed, advanced by cron.
    campaignState: defineTable({
      weekNumber: v.number(), // 1–16
      dayOfWeek: v.number(), // 1–5 (Mon–Fri school days)
      actNumber: v.number(), // 1–4
      isActive: v.boolean(),
      startedAt: v.number(),
      lastAdvancedAt: v.number(),
    }),

    // Tracks daily agent check-ins so we know who's seen today's briefing.
    agentCheckins: defineTable({
      agentId: v.id("agents"),
      userId: v.id("users"),
      weekNumber: v.number(),
      dayOfWeek: v.number(),
      checkedInAt: v.number(),
    })
      .index("by_agent_day", ["agentId", "weekNumber", "dayOfWeek"])
      .index("by_userId", ["userId"]),
  },
  { schemaValidation: false },
);
