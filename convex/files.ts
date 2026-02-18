import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: { purpose: v.union(v.literal("art"), v.literal("export")) },
  handler: async (ctx, _args) => {
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
  }
});

