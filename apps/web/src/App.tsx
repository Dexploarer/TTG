import { BrowserRouter, Routes, Route } from "react-router";
import * as Sentry from "@sentry/react";
import { Toaster } from "sonner";
import { useIframeMode } from "@/hooks/useIframeMode";
import { useTelegramAuth } from "@/hooks/auth/useTelegramAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AgentSpectatorView } from "@/components/game/AgentSpectatorView";
import { Home } from "@/pages/Home";
import { Onboarding } from "@/pages/Onboarding";
import { Collection } from "@/pages/Collection";
import { Story } from "@/pages/Story";
import { StoryChapter } from "@/pages/StoryChapter";
import { Decks } from "@/pages/Decks";
import { Play } from "@/pages/Play";
import { Privacy } from "@/pages/Privacy";
import { Terms } from "@/pages/Terms";
import { About } from "@/pages/About";
import { Token } from "@/pages/Token";
import { AgentDev } from "@/pages/AgentDev";
import { Leaderboard } from "@/pages/Leaderboard";
import { Watch } from "@/pages/Watch";
import { DeckBuilder } from "@/pages/DeckBuilder";

const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

function PageErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfb] px-6">
      <h1
        className="text-3xl font-black uppercase tracking-tighter text-[#121212] mb-3"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        Page Crashed
      </h1>
      <p
        className="text-[#121212]/60 text-sm mb-6 max-w-md text-center"
        style={{ fontFamily: "Special Elite, cursive" }}
      >
        This page broke down. Vice counter +1.
      </p>
      <div className="flex gap-3">
        <button onClick={resetError} className="tcg-button px-6 py-2">
          Retry
        </button>
        <button onClick={() => window.location.assign("/")} className="tcg-button-primary px-6 py-2">
          Go Home
        </button>
      </div>
    </div>
  );
}

function Guarded({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={PageErrorFallback}>
      <AuthGuard>{children}</AuthGuard>
    </Sentry.ErrorBoundary>
  );
}

function Public({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={PageErrorFallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

const CONVEX_SITE_URL = (import.meta.env.VITE_CONVEX_URL ?? "")
  .replace(".convex.cloud", ".convex.site");

export function App() {
  const { isEmbedded, authToken, isApiKey } = useIframeMode();
  useTelegramAuth();

  // Spectator mode: agent API key received via postMessage → show spectator view
  if (isApiKey && authToken) {
    return (
      <Sentry.ErrorBoundary fallback={PageErrorFallback}>
        <AgentSpectatorView apiKey={authToken} apiUrl={CONVEX_SITE_URL} />
      </Sentry.ErrorBoundary>
    );
  }

  return (
    <BrowserRouter>
      <SentryRoutes>
        {/* Public */}
        <Route path="/" element={<Public><Home /></Public>} />
        <Route path="/privacy" element={<Public><Privacy /></Public>} />
        <Route path="/terms" element={<Public><Terms /></Public>} />
        <Route path="/about" element={<Public><About /></Public>} />
        <Route path="/token" element={<Public><Token /></Public>} />
        <Route path="/agent-dev" element={<Public><AgentDev /></Public>} />
        <Route path="/leaderboard" element={<Public><Leaderboard /></Public>} />
        <Route path="/watch" element={<Public><Watch /></Public>} />

        {/* Auth-required */}
        <Route path="/onboarding" element={<Guarded><Onboarding /></Guarded>} />
        <Route path="/collection" element={<Guarded><Collection /></Guarded>} />
        <Route path="/story" element={<Guarded><Story /></Guarded>} />
        <Route path="/story/:chapterId" element={<Guarded><StoryChapter /></Guarded>} />
        <Route path="/decks" element={<Guarded><Decks /></Guarded>} />
        <Route path="/decks/:deckId" element={<Guarded><DeckBuilder /></Guarded>} />
        <Route path="/play/:matchId" element={<Guarded><Play /></Guarded>} />
      </SentryRoutes>
      <Toaster
        position={isEmbedded ? "bottom-center" : "bottom-right"}
        toastOptions={{
          className: "paper-panel !rounded-none",
          style: {
            border: "2px solid #121212",
            fontFamily: "Outfit, sans-serif",
          },
        }}
      />
    </BrowserRouter>
  );
}
