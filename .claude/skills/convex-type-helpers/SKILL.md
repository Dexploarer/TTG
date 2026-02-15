---
name: convex-type-helpers
description: "Fix TS2589 type instantiation errors with Convex. Use when encountering type depth errors in frontend Convex code."
allowed-tools: [Read, Write, Edit, Glob]
---

# Convex Type Helpers - TS2589 Fixes

## The Problem

**Error**: "Type instantiation is excessively deep and possibly infinite" (TS2589)

**Cause**: Convex generates deeply nested types that exceed TypeScript's recursion limits when:
- Using `useMutation(api.x.y)` or `useQuery(api.x.y)` directly
- Inline object literals in component function calls
- Cross-module type inference chains

## Solution: convexHelpers.ts

**MUST exist at** `lib/convexHelpers.ts` (or equivalent path):

```typescript
import { api } from "@convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";

export const apiAny = api as any;

export function useConvexMutation(path: any) {
  return useMutation(path);
}

export function useConvexQuery(path: any, args?: any) {
  return useQuery(path, args);
}

export function useConvexAction(path: any) {
  return useAction(path);
}
```

## Usage

```typescript
// BEFORE (broken)
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
const myMutation = useMutation(api.game.createDeck); // TS2589!

// AFTER (fixed)
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";
const myMutation = useConvexMutation(apiAny.game.createDeck); // Works!
```

## Quick Fix Checklist

1. Import from `@/lib/convexHelpers`, never `convex/react` directly
2. Use `apiAny.module.function` instead of `api.module.function`
3. Extract inline objects to variables before passing to Convex calls
4. Add `skipLibCheck: true` to tsconfig if needed
