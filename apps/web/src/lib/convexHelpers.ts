import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { FunctionReference } from "convex/server";

export const convex = {
  api,
} as const;

// Backward-compatible alias while callsites migrate to typed helpers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiAny = api as any;

/**
 * Strictly typed helper for Convex public mutations.
 */
export function useConvexMutation<
  TArgs,
  TResult,
>(path: FunctionReference<"mutation", "public", TArgs, TResult>) {
  return useMutation(path);
}

/**
 * Strictly typed helper for Convex public queries.
 *
 * Use "skip" when the query should be paused until prerequisites are ready.
 */
export function useConvexQuery<TArgs, TResult>(
  path: FunctionReference<"query", "public", TArgs, TResult>,
  args?: TArgs | "skip",
) {
  return useQuery(path, args as TArgs);
}

/**
 * Strictly typed helper for Convex public actions.
 */
export function useConvexAction<TArgs, TResult>(
  path: FunctionReference<"action", "public", TArgs, TResult>,
) {
  return useAction(path);
}
