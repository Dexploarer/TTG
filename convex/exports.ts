import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nowTs } from "./_helpers";

export const upsertExport = mutation({
  args: {
    cardId: v.string(),
    templateVersion: v.number(),
    cardVersion: v.number(),
    artVersion: v.number(),
    pngStorageId: v.id("_storage"),
    checksumSha256: v.optional(v.string()),
    manifest: v.any()
  },
  handler: async (ctx, args) => {
    const updatedAt = nowTs();

    const existing = await ctx.db
      .query("exports")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .unique();

    const payload = {
      cardId: args.cardId,
      templateVersion: args.templateVersion,
      cardVersion: args.cardVersion,
      artVersion: args.artVersion,
      pngStorageId: args.pngStorageId,
      pngPath: undefined,
      manifest: args.manifest,
      checksumSha256: args.checksumSha256,
      updatedAt
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("exports", payload);
    }

    return payload;
  }
});

export const getManifest = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("exports").collect();
    const sorted = records.sort((a, b) => b.updatedAt - a.updatedAt);

    const entries = await Promise.all(
      sorted.map(async (record) => ({
        cardId: record.cardId,
        templateVersion: record.templateVersion,
        cardVersion: record.cardVersion,
        artVersion: record.artVersion,
        checksumSha256: record.checksumSha256 ?? null,
        pngUrl: await ctx.storage.getUrl(record.pngStorageId),
        manifest: record.manifest
      }))
    );

    return {
      generatedAt: sorted[0]?.updatedAt ?? Date.now(),
      entries
    };
  }
});

export const downloadPng = query({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("exports")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .unique();

    if (!record) return null;

    return {
      cardId: record.cardId,
      url: await ctx.storage.getUrl(record.pngStorageId)
    };
  }
});

