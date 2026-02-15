---
name: convex-best-practices
description: "Convex development best practices - function patterns, schema design, indexing, testing, auth patterns. Use when writing Convex backend code."
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Convex Best Practices (2026)

## Core Principles

1. **Thin API Layer** - `convex/game.ts` delegates to component clients
2. **Internal Functions** - Use `internalQuery`/`internalMutation` for composition
3. **Index-First** - Always use indexes, never `.filter()` on DB queries
4. **Type Safety** - Use `returns` validators for runtime validation
5. **Components** - White-label components own their schemas

## Function Patterns

### Query
```typescript
export const myQuery = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUser(ctx); // Auth check
    return await ltcgCards.cards.getUserCards(ctx, { userId: user._id });
  },
});
```

### Mutation
```typescript
export const myMutation = mutation({
  args: { deckId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    await ltcgCards.decks.saveDeck(ctx, { deckId: args.deckId, name: args.name });
  },
});
```

### Scheduled (AI turns)
```typescript
export const executeAITurn = internalMutation({
  args: { matchId: v.string() },
  handler: async (ctx, { matchId }) => {
    // Load state, compute legalMoves, pick best, submit
  },
});

// Schedule from another mutation:
await ctx.scheduler.runAfter(500, internal.game.executeAITurn, { matchId });
```

## Indexing Rules

```typescript
// ALWAYS use indexes
const results = await ctx.db
  .query("users")
  .withIndex("by_privyId", (q) => q.eq("privyId", privyId))
  .unique();

// NEVER use .filter()
// BAD: const users = await ctx.db.query("users").filter(q => q.eq(q.field("privyId"), id)).collect();
```

### Composite indexes serve prefix queries
```typescript
// One index handles both queries:
.index("by_team_and_user", ["team", "user"])

// All team members:
.withIndex("by_team_and_user", (q) => q.eq("team", teamId))
// Specific member:
.withIndex("by_team_and_user", (q) => q.eq("team", teamId).eq("user", userId))
```

## Auth Pattern (Privy)

```typescript
// convex/auth.ts
export const syncUser = mutation({
  args: { privyId: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", args.privyId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args });
      return existing._id;
    }
    return await ctx.db.insert("users", { ...args, createdAt: Date.now() });
  },
});

// Helper used by all functions
async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  const user = await ctx.db
    .query("users")
    .withIndex("by_privyId", (q) => q.eq("privyId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}
```

## TS2589 Prevention

```typescript
// ALWAYS extract inline objects
const opts = { namespace: id, bounds: {} };
return aggregate.count(ctx, opts);

// NEVER inline
// return aggregate.count(ctx, { namespace: id, bounds: {} }); // TS2589!

// Use convexHelpers in frontend
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";
```

## Testing with convex-test

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";

describe("game", () => {
  it("creates a deck", async () => {
    const t = convexTest(schema);
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { privyId: "test", createdAt: Date.now() });
    });
    t.withIdentity({ subject: "test" });
    const result = await t.mutation(api.game.createDeck, { name: "Test" });
    expect(result).toBeDefined();
  });
});
```

## Common Pitfalls

1. **No `.filter()`** - Always use indexes
2. **No `fetch()` in queries/mutations** - Use actions for external calls
3. **Always auth check** - Every public function needs `getUser(ctx)`
4. **Extract objects** - Don't inline complex objects in component calls
5. **Schema validation off** - Currently disabled, don't rely on it
