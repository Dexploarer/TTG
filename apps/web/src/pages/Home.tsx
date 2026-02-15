import { useCallback } from "react";
import { useNavigate } from "react-router";
import { usePrivy } from "@privy-io/react-auth";
import { useIframeMode } from "@/hooks/useIframeMode";
import { usePostLoginRedirect, storeRedirect } from "@/hooks/auth/usePostLoginRedirect";
import { TrayNav } from "@/components/layout/TrayNav";

function Panel({
  title,
  subtitle,
  bgImage,
  children,
  onClick,
}: {
  title: string;
  subtitle: string;
  bgImage?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative group flex flex-col justify-end cursor-pointer
        transition-all duration-150
        hover:-translate-x-0.5 hover:-translate-y-0.5
        active:translate-x-0.5 active:translate-y-0.5"
    >
      <img
        src="/lunchtable/ink-frame.png"
        alt=""
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
        draggable={false}
      />
      {bgImage ? (
        <div
          className="absolute inset-[6%] bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      ) : (
        <div className="absolute inset-[6%] bg-[#fdfdfb] z-0" />
      )}
      <div
        className="absolute inset-[6%] opacity-[0.03] pointer-events-none z-[1]"
        style={{
          backgroundImage: "radial-gradient(#121212 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      />
      {bgImage && (
        <div className="absolute inset-[6%] bg-gradient-to-t from-black/80 via-black/30 to-transparent z-[2]" />
      )}
      <div className="relative z-10 text-left p-[12%] pt-[20%] pl-[16%]">
        {children}
        <h2
          className={`text-2xl md:text-3xl leading-none mb-1 ${bgImage ? "text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" : ""}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h2>
        <p
          className={`text-xs md:text-sm leading-tight ${bgImage ? "text-white/80" : "text-[#666]"}`}
          style={{ fontFamily: "Special Elite, cursive" }}
        >
          {subtitle}
        </p>
      </div>
    </button>
  );
}

export function Home() {
  const { isEmbedded } = useIframeMode();
  const navigate = useNavigate();
  const { authenticated, login } = usePrivy();

  // After Privy login returns to Home, auto-navigate to the saved destination
  usePostLoginRedirect();

  const goTo = useCallback(
    (path: string, requiresAuth: boolean) => {
      if (requiresAuth && !authenticated) {
        storeRedirect(path);
        login();
        return;
      }
      navigate(path);
    },
    [authenticated, login, navigate],
  );

  return (
    <div
      className="h-screen flex flex-col bg-cover bg-center bg-no-repeat relative overflow-hidden"
      style={{ backgroundImage: "url('/lunchtable/landing-bg.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/50" />

      {/* Decorative pill bottle */}
      <img
        src="/lunchtable/deco-pills.png"
        alt=""
        className="absolute bottom-16 left-2 md:left-6 h-32 md:h-48 w-auto opacity-20 pointer-events-none z-[15] select-none"
        draggable={false}
      />

      {/* Header */}
      <header className="relative z-10 text-center pt-8 pb-4 px-4">
        <img
          src="/lunchtable/title.png"
          alt="LunchTable"
          className="h-16 md:h-24 mx-auto drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
          draggable={false}
        />
        <p
          className="text-base md:text-lg text-[#ffcc00] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          style={{ fontFamily: "Special Elite, cursive" }}
        >
          School of Hard Knocks
        </p>
      </header>

      {/* Comic panels grid */}
      <div className="relative z-10 flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-4 md:p-8 max-w-4xl w-full mx-auto">
        <Panel
          title="Story Mode"
          subtitle="Fight your way through the halls"
          bgImage="/lunchtable/story-bg.png"
          onClick={() => goTo("/story", true)}
        >
          <div className="text-4xl mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">&#9876;</div>
        </Panel>

        <Panel
          title="Collection"
          subtitle="132 cards across 6 archetypes"
          bgImage="/lunchtable/collection-bg.png"
          onClick={() => goTo("/collection", true)}
        >
          <div className="text-4xl mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">&#9830;</div>
        </Panel>

        <Panel
          title="Build Deck"
          subtitle="Stack your hand before the bell rings"
          bgImage="/lunchtable/deck-bg.png"
          onClick={() => goTo("/decks", true)}
        >
          <div className="text-4xl mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">&#9998;</div>
        </Panel>

        <Panel
          title="Watch Live"
          subtitle="Agents streaming on retake.tv"
          bgImage="/lunchtable/watch-bg.png"
          onClick={() => goTo("/watch", false)}
        >
          <div className="text-4xl mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">&#9655;</div>
        </Panel>
      </div>

      {isEmbedded && (
        <p
          className="relative z-10 text-center text-xs text-white/40 pb-14"
          style={{ fontFamily: "Special Elite, cursive" }}
        >
          Running inside milaidy
        </p>
      )}

      <TrayNav />
    </div>
  );
}
