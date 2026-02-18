import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateTemplateManifestLite } from "./_validators";
import { nextVersion, nowTs } from "./_helpers";

export const create = mutation({
  args: { manifest: v.any() },
  handler: async (ctx, args) => {
    const validation = validateTemplateManifestLite(args.manifest);
    const manifest = validation.value;
    if (!validation.ok || !manifest) {
      throw new Error(`Template validation failed: ${validation.issues.join(", ")}`);
    }

    const existing = await ctx.db
      .query("templates")
      .withIndex("by_template_id", (q) => q.eq("templateId", manifest.templateId))
      .unique();

    if (existing) {
      throw new Error(`Template already exists: ${manifest.templateId}`);
    }

    const version = nextVersion(undefined);
    const updatedAt = nowTs();

    await ctx.db.insert("templates", {
      templateId: manifest.templateId,
      manifest,
      version,
      updatedAt
    });

    return {
      value: manifest,
      version,
      updatedAt
    };
  }
});

export const update = mutation({
  args: {
    templateId: v.string(),
    manifest: v.any()
  },
  handler: async (ctx, args) => {
    const validation = validateTemplateManifestLite(args.manifest);
    const manifest = validation.value;
    if (!validation.ok || !manifest) {
      throw new Error(`Template validation failed: ${validation.issues.join(", ")}`);
    }

    const existing = await ctx.db
      .query("templates")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .unique();

    if (!existing) {
      throw new Error(`Template not found: ${args.templateId}`);
    }

    const version = nextVersion(existing.version);
    const updatedAt = nowTs();

    await ctx.db.patch(existing._id, {
      manifest,
      version,
      updatedAt
    });

    return {
      value: manifest,
      version,
      updatedAt
    };
  }
});

export const get = query({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("templates")
      .withIndex("by_template_id", (q) => q.eq("templateId", args.templateId))
      .unique();

    if (!record) return null;
    return {
      value: record.manifest,
      version: record.version,
      updatedAt: record.updatedAt
    };
  }
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("templates").collect();
    return records
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((record) => ({
        value: record.manifest,
        version: record.version,
        updatedAt: record.updatedAt
      }));
  }
});
