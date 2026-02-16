import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/react";
import { apiAny, useConvexQuery, useConvexMutation } from "@/lib/convexHelpers";
import {
  StoryProvider,
  StagePanel,
  DialogueBox,
  BattleTransition,
  useStory,
  type Stage,
} from "@/components/story";
import { TrayNav } from "@/components/layout/TrayNav";
import { STAGES_BG, QUESTIONS_LABEL } from "@/lib/blobUrls";

export function StoryChapter() {
  return (
    <StoryProvider>
      <StoryChapterInner />
      <DialogueBox />
      <BattleTransition />
      <TrayNav />
    </StoryProvider>
  );
}

function StoryChapterInner() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { pushEvents } = useStory();

  const stages = useConvexQuery(
    apiAny.game.getChapterStages,
    chapterId ? { chapterId } : "skip",
  ) as Stage[] | undefined;

  const startBattle = useConvexMutation(apiAny.game.startStoryBattle);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const sorted = [...(stages ?? [])].sort((a, b) => a.stageNumber - b.stageNumber);

  const handleStartBattle = async (stage: Stage) => {
    if (!chapterId) return;
    setStarting(stage.stageNumber);
    setError("");

    try {
      // Play pre-match dialogue if available
      if (stage.preMatchDialogue && stage.preMatchDialogue.length > 0) {
        pushEvents([{ type: "dialogue", lines: stage.preMatchDialogue }]);
      }

      // Battle transition
      pushEvents([{ type: "transition", variant: "battle-start" }]);

      const result = await startBattle({ chapterId, stageNumber: stage.stageNumber });
      navigate(`/play/${result.matchId}`);
    } catch (err: any) {
      Sentry.captureException(err);
      setError(err.message ?? "Failed to start battle.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <div
      className="min-h-screen pb-24 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('${STAGES_BG}')` }}
    >
      <div className="absolute inset-0 bg-[#fdfdfb]/80" />
      <header className="relative z-10 border-b-2 border-[#121212] px-6 py-5">
        <button
          type="button"
          onClick={() => navigate("/story")}
          className="text-xs font-bold uppercase tracking-wider text-[#666] hover:text-[#121212] transition-colors mb-2 block text-center"
          style={{ fontFamily: "Special Elite, cursive" }}
        >
          &larr; Back to homework
        </button>
        <img
          src={QUESTIONS_LABEL}
          alt="QUESTIONS"
          className="h-28 md:h-36 mx-auto"
          draggable={false}
        />
      </header>

      <div className="relative z-10 p-6 max-w-3xl mx-auto">
        {!stages ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="paper-panel p-12 text-center">
            <p className="text-[#666] font-bold uppercase text-sm">
              No stages in this chapter yet.
            </p>
          </div>
        ) : (
          <motion.div
            className="flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {sorted.map((stage) => (
              <StagePanel
                key={stage._id}
                stage={stage}
                isStarting={starting === stage.stageNumber}
                onFight={() => handleStartBattle(stage)}
                chapterId={chapterId}
              />
            ))}

            {error && (
              <p className="text-red-600 text-sm font-bold uppercase text-center">{error}</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
