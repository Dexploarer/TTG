import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nextVersion, nowTs } from "./_helpers";

function nonEmpty(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Value must be non-empty");
  }
  return trimmed;
}

export const upsert = mutation({
  args: {
    artAssetId: v.string(),
    sourceMode: v.union(v.literal("upload"), v.literal("external"), v.literal("ai_fal")),
    storageId: v.optional(v.id("_storage")),
    sourceUri: v.optional(v.string()),
    prompt: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("fal"))),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rightsTier: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const artAssetId = nonEmpty(args.artAssetId);

    if (args.sourceMode === "upload" && !args.storageId) {
      throw new Error("storageId is required for upload art assets.");
    }
    if (args.sourceMode === "external" && !args.sourceUri) {
      throw new Error("sourceUri is required for external art assets.");
    }
    if (args.sourceMode === "ai_fal" && !args.storageId && !args.sourceUri) {
      throw new Error("storageId or sourceUri is required for ai_fal art assets.");
    }

    const existing = await ctx.db
      .query("artAssets")
      .withIndex("by_art_asset_id", (q) => q.eq("artAssetId", artAssetId))
      .unique();

    const updatedAt = nowTs();
    const version = nextVersion(existing?.version);
    const createdAt = existing?.createdAt ?? updatedAt;

    const payload = {
      artAssetId,
      sourceMode: args.sourceMode,
      storageId: args.storageId,
      sourceUri: args.sourceUri,
      prompt: args.prompt,
      provider: args.provider,
      version,
      width: args.width,
      height: args.height,
      rightsTier: args.rightsTier,
      createdAt,
      updatedAt
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, payload);
    } else {
      await ctx.db.insert("artAssets", payload);
    }

    return payload;
  }
});

export const get = query({
  args: { artAssetId: v.string() },
  handler: async (ctx, args) => {
    const artAssetId = args.artAssetId.trim();
    if (artAssetId.length === 0) return null;

    return await ctx.db
      .query("artAssets")
      .withIndex("by_art_asset_id", (q) => q.eq("artAssetId", artAssetId))
      .unique();
  }
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("artAssets").collect();
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  }
});

export const getUrl = query({
  args: { artAssetId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("artAssets")
      .withIndex("by_art_asset_id", (q) => q.eq("artAssetId", args.artAssetId))
      .unique();

    if (!record) {
      return { url: null, version: 0 };
    }

    if (record.storageId) {
      const url = await ctx.storage.getUrl(record.storageId);
      return { url, version: record.version };
    }

    return {
      url: record.sourceUri ?? null,
      version: record.version
    };
  }
});

