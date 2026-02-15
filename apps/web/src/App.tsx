import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { useIframeMode } from "@/hooks/useIframeMode";
import { useTelegramAuth } from "@/hooks/auth/useTelegramAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
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

export function App() {
  const { isEmbedded } = useIframeMode();
  useTelegramAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="/token" element={<Token />} />
        <Route path="/agent-dev" element={<AgentDev />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/watch" element={<Watch />} />

        {/* Auth-required */}
        <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />
        <Route path="/collection" element={<AuthGuard><Collection /></AuthGuard>} />
        <Route path="/story" element={<AuthGuard><Story /></AuthGuard>} />
        <Route path="/story/:chapterId" element={<AuthGuard><StoryChapter /></AuthGuard>} />
        <Route path="/decks" element={<AuthGuard><Decks /></AuthGuard>} />
        <Route path="/decks/:deckId" element={<AuthGuard><DeckBuilder /></AuthGuard>} />
        <Route path="/play/:matchId" element={<AuthGuard><Play /></AuthGuard>} />
      </Routes>
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
