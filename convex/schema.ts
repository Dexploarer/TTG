import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  templates: defineTable({
    templateId: v.string(),
    manifest: v.any(),
    version: v.number(),
    updatedAt: v.number()
  }).index("by_template_id", ["templateId"]),

  cards: defineTable({
    cardId: v.string(),
    data: v.any(),
    version: v.number(),
    updatedAt: v.number()
  }).index("by_card_id", ["cardId"]),

  effects: defineTable({
    effectId: v.string(),
    spec: v.any(),
    version: v.number(),
    updatedAt: v.number()
  }).index("by_effect_id", ["effectId"]),

  artAssets: defineTable({
    artAssetId: v.string(),
    sourceMode: v.union(v.literal("upload"), v.literal("external"), v.literal("ai_fal")),
    storageId: v.optional(v.id("_storage")),
    sourceUri: v.optional(v.string()),
    prompt: v.optional(v.string()),
    provider: v.optional(v.union(v.literal("fal"))),
    version: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rightsTier: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_art_asset_id", ["artAssetId"]),

  imports: defineTable({
    importId: v.string(),
    kind: v.union(v.literal("cards"), v.literal("effects"), v.literal("art")),
    fileHash: v.string(),
    rowCount: v.number(),
    issues: v.array(v.any()),
    createdAt: v.number()
  }).index("by_created_at", ["createdAt"]),

  runtime: defineTable({
    cardId: v.string(),
    state: v.any(),
    appliedEffects: v.array(v.string()),
    updatedAt: v.number()
  }).index("by_card_id", ["cardId"]),

  renderJobs: defineTable({
    jobId: v.string(),
    status: v.union(v.literal("queued"), v.literal("running"), v.literal("succeeded"), v.literal("failed")),
    cardIds: v.array(v.string()),
    outputs: v.array(v.any()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string())
  })
    .index("by_job_id", ["jobId"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  exports: defineTable({
    cardId: v.string(),
    templateVersion: v.number(),
    cardVersion: v.number(),
    artVersion: v.number(),
    pngStorageId: v.id("_storage"),
    pngPath: v.optional(v.string()),
    manifest: v.any(),
    checksumSha256: v.optional(v.string()),
    updatedAt: v.number()
  }).index("by_card_id", ["cardId"])
});
