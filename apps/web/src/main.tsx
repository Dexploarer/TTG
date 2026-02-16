import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from "react-router";
import * as Sentry from "@sentry/react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { PrivyAuthProvider } from "@/components/auth/PrivyAuthProvider";
import { usePrivyAuthForConvex } from "@/hooks/auth/usePrivyAuthForConvex";
import { App } from "./App";
import "./globals.css";

Sentry.init({
  dsn: "https://a7569b5f75f669147fd70828a7f15433@o4510892044124160.ingest.us.sentry.io/4510892046155776",
  integrations: [
    Sentry.reactRouterV7BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfb] px-6">
          <h1
            className="text-4xl font-black uppercase tracking-tighter text-[#121212] mb-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Something Broke
          </h1>
          <p
            className="text-[#121212]/60 text-sm mb-6 max-w-md text-center"
            style={{ fontFamily: "Special Elite, cursive" }}
          >
            The cafeteria just exploded. Our janitors have been notified.
          </p>
          <button onClick={resetError} className="tcg-button px-6 py-3">
            Try Again
          </button>
        </div>
      )}
      showDialog
    >
      <PrivyAuthProvider>
        <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuthForConvex}>
          <App />
        </ConvexProviderWithAuth>
      </PrivyAuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
