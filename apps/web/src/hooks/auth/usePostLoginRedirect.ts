import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { usePrivy } from "@privy-io/react-auth";

const REDIRECT_KEY = "ltcg_redirect";

/**
 * After Privy login completes on a public page (e.g. Home),
 * check for a saved redirect and navigate there.
 *
 * The redirect stays in sessionStorage so that AuthGuard → Onboarding
 * can consume it after onboarding completes. It's only removed
 * by the final consumer (Onboarding or AuthGuard).
 */
export function usePostLoginRedirect() {
  const { authenticated } = usePrivy();
  const navigate = useNavigate();
  const fired = useRef(false);

  useEffect(() => {
    if (!authenticated || fired.current) return;

    const path = sessionStorage.getItem(REDIRECT_KEY);
    if (path) {
      fired.current = true;
      navigate(path);
    }
  }, [authenticated, navigate]);
}

/** Store a redirect path before triggering login. */
export function storeRedirect(path: string) {
  sessionStorage.setItem(REDIRECT_KEY, path);
}

/** Read and remove the redirect path (call at the end of a flow). */
export function consumeRedirect() {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  if (path) sessionStorage.removeItem(REDIRECT_KEY);
  return path;
}
