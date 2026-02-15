import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useMemo } from "react";
import { useIframeMode } from "@/hooks/useIframeMode";

/**
 * Validates that a token looks like a JWT (3 dot-separated base64 segments).
 * This is a basic sanity check, not cryptographic verification.
 */
function looksLikeJWT(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  // All parts should be valid base64url (alphanumeric, -, _)
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => base64urlPattern.test(part));
}

/**
 * Bridges authentication to Convex.
 * Returns the interface expected by ConvexProviderWithAuth.
 *
 * Two paths:
 * 1. Iframe (milaidy) — host sends LTCG_AUTH with authToken via postMessage
 * 2. Browser — user logs in via Privy, SDK provides JWT
 *
 * Iframe token takes priority when available.
 */
export function usePrivyAuthForConvex() {
  const { isEmbedded, authToken: iframeToken } = useIframeMode();
  const { ready, authenticated, getAccessToken } = usePrivy();

  // Validate iframe token format
  const isValidIframeToken = iframeToken ? looksLikeJWT(iframeToken) : false;
  const hasIframeAuth = isEmbedded && isValidIframeToken;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken: _ }: { forceRefreshToken: boolean }) => {
      // Iframe mode: use host-provided token directly (already validated)
      if (hasIframeAuth) return iframeToken;

      // Browser mode: get token from Privy
      if (!authenticated) return null;
      try {
        return await getAccessToken();
      } catch (err) {
        console.error("[auth] Failed to get Privy access token:", err);
        return null;
      }
    },
    [hasIframeAuth, iframeToken, getAccessToken, authenticated],
  );

  return useMemo(
    () => ({
      isLoading: hasIframeAuth ? false : !ready,
      isAuthenticated: hasIframeAuth ? true : authenticated,
      fetchAccessToken,
    }),
    [hasIframeAuth, ready, authenticated, fetchAccessToken],
  );
}
