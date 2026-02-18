import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { jobId, nowTs } from "./_helpers";

export const enqueueCard = mutation({
  args: { cardId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_card_id", (q) => q.eq("cardId", args.cardId))
      .unique();
    if (!existing) {
      throw new Error(`Card not found: ${args.cardId}`);
    }

    const createdAt = nowTs();
    const record = {
      jobId: jobId("job"),
      status: "queued" as const,
      cardIds: [args.cardId],
      outputs: [],
      createdAt
    };
    await ctx.db.insert("renderJobs", record);
    return record;
  }
});

export const enqueueBatch = mutation({
  args: { cardIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    if (args.cardIds.length === 0) {
      throw new Error("cardIds is required");
    }

    for (const cardId of args.cardIds) {
      const existing = await ctx.db
        .query("cards")
        .withIndex("by_card_id", (q) => q.eq("cardId", cardId))
        .unique();
      if (!existing) {
        throw new Error(`Card not found: ${cardId}`);
      }
    }

    const createdAt = nowTs();
    const record = {
      jobId: jobId("job"),
      status: "queued" as const,
      cardIds: args.cardIds,
      outputs: [],
      createdAt
    };
    await ctx.db.insert("renderJobs", record);
    return record;
  }
});

export const claimNextJob = mutation({
  args: {},
  handler: async (ctx) => {
    const next = await ctx.db
      .query("renderJobs")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();

    if (!next) return null;

    await ctx.db.patch(next._id, { status: "running" as const });
    return {
      jobId: next.jobId,
      status: "running" as const,
      cardIds: next.cardIds,
      outputs: next.outputs,
      createdAt: next.createdAt
    };
  }
});

export const completeJob = mutation({
  args: {
    jobId: v.string(),
    outputs: v.array(v.any()),
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("renderJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();

    if (!record) {
      throw new Error(`render job not found: ${args.jobId}`);
    }

    const completedAt = nowTs();
    const status = args.error ? ("failed" as const) : ("succeeded" as const);
    const error = args.error?.slice(0, 2000);

    await ctx.db.patch(record._id, {
      status,
      outputs: args.outputs,
      completedAt,
      error
    });

    return {
      jobId: record.jobId,
      status,
      cardIds: record.cardIds,
      outputs: args.outputs,
      createdAt: record.createdAt,
      completedAt,
      error
    };
  }
});

export const getJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("renderJobs")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .unique();
  }
});

