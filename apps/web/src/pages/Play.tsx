import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { apiAny, useConvexQuery, useConvexMutation } from "@/lib/convexHelpers";
import { VictoryScreen } from "@/components/story";

type MatchMeta = {
  status: string;
  hostId: string;
  awayId: string;
  mode: string;
  isAIOpponent?: boolean;
  winner?: string;
};

export function Play() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const meta = useConvexQuery(
    apiAny.game.getMatchMeta,
    matchId ? { matchId } : "skip",
  ) as MatchMeta | null | undefined;

  const viewJson = useConvexQuery(
    apiAny.game.getPlayerView,
    matchId ? { matchId, seat: "host" as const } : "skip",
  ) as string | null | undefined;

  const submitAction = useConvexMutation(apiAny.game.submitAction);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const view = viewJson ? tryParse(viewJson) : null;
  const gameOver = view?.gameOver;
  const isMyTurn = view?.currentTurnPlayer === "host";
  const currentPhase = view?.phase;

  const handleAction = useCallback(
    async (command: Record<string, unknown>) => {
      if (!matchId || submitting) return;
      setSubmitting(true);
      setError("");

      try {
        await submitAction({
          matchId,
          command: JSON.stringify(command),
          seat: "host" as const,
        });
      } catch (err: any) {
        setError(err.message ?? "Action failed.");
      } finally {
        setSubmitting(false);
      }
    },
    [matchId, submitAction, submitting],
  );

  const endTurn = () => handleAction({ type: "END_TURN" });
  const advancePhase = () => handleAction({ type: "ADVANCE_PHASE" });

  // Loading
  if (!matchId) return <CenterMessage>No match ID.</CenterMessage>;
  if (meta === undefined || viewJson === undefined) return <Loading />;
  if (meta === null) return <CenterMessage>Match not found.</CenterMessage>;

  // Game over
  if (gameOver || meta.status === "completed") {
    const won = meta.winner === meta.hostId;
    const isStory = meta.mode === "story";

    if (isStory) {
      return (
        <VictoryScreen
          won={won}
          starsEarned={won ? 1 : 0}
          storyPath="/story"
        />
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
        <div className="paper-panel p-12 text-center max-w-md">
          <h1
            className="text-5xl mb-4"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
          >
            {won ? "VICTORY" : "DEFEAT"}
          </h1>
          <p
            className="text-sm text-[#666] mb-8"
            style={{ fontFamily: "Special Elite, cursive" }}
          >
            {won
              ? "You proved your worth at the table."
              : "The hallway isn't done with you yet."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/story")}
            className="tcg-button-primary px-8 py-3 text-lg"
          >
            BACK TO STORY
          </button>
        </div>
      </div>
    );
  }

  // Active game
  return (
    <div className="min-h-screen bg-[#fdfdfb] flex flex-col">
      {/* Top bar */}
      <header className="border-b-2 border-[#121212] px-4 py-3 flex items-center justify-between">
        <div>
          <h1
            className="text-lg"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
          >
            MATCH
          </h1>
          <p className="text-[10px] text-[#999] uppercase tracking-wider">
            {currentPhase ?? "..."} &middot;{" "}
            {isMyTurn ? "Your turn" : "Opponent's turn"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Stat label="Your LP" value={view?.players?.host?.lifePoints ?? "?"} />
          <Stat label="Opp LP" value={view?.players?.away?.lifePoints ?? "?"} />
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full">
        {/* Opponent field */}
        <FieldRow
          label="Opponent"
          monsters={view?.opponentField?.monsters}
          spellTraps={view?.opponentField?.spellTraps}
          faceDown
        />

        {/* Divider */}
        <div className="h-px bg-[#121212]/20 my-2" />

        {/* Your field */}
        <FieldRow
          label="You"
          monsters={view?.playerField?.monsters}
          spellTraps={view?.playerField?.spellTraps}
        />

        {/* Hand */}
        <div className="mt-4">
          <p
            className="text-xs text-[#999] uppercase tracking-wider mb-2"
            style={{ fontFamily: "Special Elite, cursive" }}
          >
            Hand ({view?.hand?.length ?? 0} cards)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {(view?.hand ?? []).map((card: any, i: number) => (
              <div
                key={card.instanceId ?? i}
                className="paper-panel p-3 min-w-[120px] shrink-0 text-xs"
              >
                <p
                  className="font-bold leading-tight mb-1 line-clamp-2"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {card.name ?? "???"}
                </p>
                {card.attack !== undefined && (
                  <p className="text-[10px] text-[#666]">
                    ATK {card.attack} / DEF {card.defense}
                  </p>
                )}
              </div>
            ))}
            {(view?.hand?.length ?? 0) === 0 && (
              <p className="text-xs text-[#999] italic">Empty hand</p>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <footer className="border-t-2 border-[#121212] px-4 py-3 flex items-center justify-between gap-3">
        {error && (
          <p className="text-red-600 text-xs font-bold uppercase flex-1">{error}</p>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={advancePhase}
            disabled={!isMyTurn || submitting}
            className="tcg-button px-4 py-2 text-xs disabled:opacity-30"
          >
            Next Phase
          </button>
          <button
            type="button"
            onClick={endTurn}
            disabled={!isMyTurn || submitting}
            className="tcg-button-primary px-4 py-2 text-xs disabled:opacity-30"
          >
            End Turn
          </button>
        </div>
      </footer>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function tryParse(json: string) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
      <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
      <p className="text-[#666] font-bold uppercase text-sm">{children}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-[#999] uppercase tracking-wider">{label}</p>
      <p
        className="text-lg leading-none"
        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
      >
        {value}
      </p>
    </div>
  );
}

function FieldRow({
  label,
  monsters,
  spellTraps,
  faceDown,
}: {
  label: string;
  monsters?: any[];
  spellTraps?: any[];
  faceDown?: boolean;
}) {
  const slots = monsters ?? [];
  const stSlots = spellTraps ?? [];

  return (
    <div>
      <p
        className="text-xs text-[#999] uppercase tracking-wider mb-2"
        style={{ fontFamily: "Special Elite, cursive" }}
      >
        {label}
      </p>
      {/* Monster zone */}
      <div className="flex gap-2 mb-2">
        {[0, 1, 2, 3, 4].map((i) => {
          const card = slots[i];
          return (
            <div
              key={i}
              className={`paper-panel-flat w-20 h-24 flex items-center justify-center text-xs ${
                card ? "" : "opacity-20"
              }`}
            >
              {card ? (
                faceDown && card.faceDown ? (
                  <span className="text-[#999]">?</span>
                ) : (
                  <div className="p-1.5 text-center">
                    <p
                      className="text-[10px] font-bold leading-tight line-clamp-2"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {card.name ?? "Set"}
                    </p>
                    {card.attack !== undefined && (
                      <p className="text-[9px] text-[#666] mt-0.5">
                        {card.attack}/{card.defense}
                      </p>
                    )}
                  </div>
                )
              ) : (
                <span className="text-[#ccc]">&mdash;</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Spell/Trap zone */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => {
          const card = stSlots[i];
          return (
            <div
              key={i}
              className={`paper-panel-flat w-20 h-12 flex items-center justify-center text-[10px] ${
                card ? "border-dashed" : "opacity-20 border-dashed"
              }`}
            >
              {card ? (
                faceDown ? (
                  <span className="text-[#999]">Set</span>
                ) : (
                  <span className="font-bold line-clamp-1 px-1">{card.name ?? "S/T"}</span>
                )
              ) : (
                <span className="text-[#ddd]">S/T</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
