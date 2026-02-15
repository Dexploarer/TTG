import { useEffect, useRef, useState } from "react";
import { signalReady, onHostMessage, type HostToGame } from "@/lib/iframe";

/**
 * Detect if the app is running inside an iframe (milaidy) and
 * manage the postMessage handshake.
 */
export function useIframeMode() {
  const isEmbedded =
    typeof window !== "undefined" && window.self !== window.top;
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const signaled = useRef(false);

  useEffect(() => {
    if (!isEmbedded) return;

    // Signal ready once
    if (!signaled.current) {
      signalReady();
      signaled.current = true;
    }

    // Listen for auth from host
    return onHostMessage((msg: HostToGame) => {
      if (msg.type === "LTCG_AUTH") {
        setAuthToken(msg.authToken);
        if (msg.agentId) setAgentId(msg.agentId);
      }
    });
  }, [isEmbedded]);

  return { isEmbedded, authToken, agentId };
}
