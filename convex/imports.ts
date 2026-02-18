import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { parseCardsCsv } from "@gambit/csv-pipeline/src/parse";
import { createInitialRuntimeState } from "@gambit/effect-engine";
import type { CardDefinition } from "@gambit/template-schema";
import { jobId, nextVersion, nowTs } from "./_helpers";
import { normalizeCardRowsLite, validateCardDefinitionLite } from "./_validators";

export const validateCsv = action({
  args: { csv: v.string() },
  handler: async (_ctx, args) => {
    const parsed = parseCardsCsv(args.csv);
    const normalized = normalizeCardRowsLite(parsed.rows);
    const issues = [...parsed.issues, ...normalized.issues];

    return {
      ok: !issues.some((issue) => issue.severity === "error"),
      fileHash: parsed.fileHash,
      rows: parsed.rows.length,
      issues,
      normalizedCards: normalized.cards
    };
  }
});

export const applyCsv = mutation({
  args: { csv: v.string() },
  handler: async (ctx, args) => {
    const parsed = parseCardsCsv(args.csv);
    const normalized = normalizeCardRowsLite(parsed.rows);
    const issues = [...parsed.issues, ...normalized.issues];

    const record = {
      importId: jobId("import"),
      fileHash: parsed.fileHash,
      rowCount: parsed.rows.length,
      issues,
      createdAt: nowTs()
    };
    await ctx.db.insert("imports", record);

    if (issues.some((issue) => issue.severity === "error")) {
      return { importRecord: record, upserted: [] };
    }

    const upserted: Array<{ value: CardDefinition; version: number; updatedAt: number }> = [];

    for (const card of normalized.cards) {
      const check = validateCardDefinitionLite(card);
      if (!check.ok || !check.value) {
        continue;
      }

      const validCard = check.value;

      const existing = await ctx.db
        .query("cards")
        .withIndex("by_card_id", (q) => q.eq("cardId", validCard.cardId))
        .unique();

      const version = nextVersion(existing?.version);
      const updatedAt = nowTs();

      if (existing) {
        await ctx.db.patch(existing._id, { data: validCard, version, updatedAt });
      } else {
        await ctx.db.insert("cards", { cardId: validCard.cardId, data: validCard, version, updatedAt });
      }

      const runtime = await ctx.db
        .query("runtime")
        .withIndex("by_card_id", (q) => q.eq("cardId", validCard.cardId))
        .unique();
      if (!runtime) {
        await ctx.db.insert("runtime", {
          cardId: validCard.cardId,
          state: createInitialRuntimeState({ cardId: validCard.cardId, baseStats: validCard.baseStats }),
          appliedEffects: [],
          updatedAt
        });
      }

      upserted.push({ value: validCard, version, updatedAt });
    }

    return { importRecord: record, upserted };
  }
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("imports").collect();
    return records.sort((a, b) => b.createdAt - a.createdAt);
  }
});
