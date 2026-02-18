import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { App } from "./App";
import "./styles.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" }}>
        <h1>Gambit Studio</h1>
        <p>
          Missing <code>VITE_CONVEX_URL</code>. Create <code>/Users/home/gambit/Gambit/apps/studio/.env.local</code> and set it.
        </p>
      </div>
    )}
  </StrictMode>
);
