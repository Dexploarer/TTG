import { usePrivy } from "@privy-io/react-auth";
import { useConvexAuth } from "convex/react";
import * as Sentry from "@sentry/react";
import { useEffect, useRef } from "react";
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";

/**
 * Post-login user sync hook.
 * Ensures a Convex user record exists after Privy authentication,
 * and tracks onboarding progress.
 */
export function useUserSync() {
  const { authenticated, user: privyUser } = usePrivy();
  const { isAuthenticated: convexReady } = useConvexAuth();

  const syncUser = useConvexMutation(apiAny.auth.syncUser);
  const onboardingStatus = useConvexQuery(
    apiAny.auth.getOnboardingStatus,
    convexReady ? {} : "skip",
  );

  const synced = useRef(false);

  useEffect(() => {
    if (!authenticated || !convexReady || synced.current) return;
    if (onboardingStatus === undefined) return; // still loading

    // User already exists in DB
    if (onboardingStatus?.exists) {
      synced.current = true;
      return;
    }

    // Create user record
    syncUser({ email: privyUser?.email?.address })
      .then(() => {
        synced.current = true;
      })
      .catch((err: unknown) => {
        Sentry.captureException(err);
      });
  }, [authenticated, convexReady, onboardingStatus, syncUser, privyUser]);

  const isLoading =
    authenticated && convexReady && !synced.current && onboardingStatus === undefined;

  const needsOnboarding =
    onboardingStatus?.exists &&
    (!onboardingStatus.hasUsername || !onboardingStatus.hasStarterDeck);

  const isReady =
    onboardingStatus?.exists &&
    onboardingStatus.hasUsername &&
    onboardingStatus.hasStarterDeck;

  return {
    isLoading,
    needsOnboarding,
    isReady,
    onboardingStatus,
  };
}
