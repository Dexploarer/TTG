import { motion } from "framer-motion";
import { useStory, type Stage } from "./StoryProvider";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#38a169",
  medium: "#d69e2e",
  hard: "#e53e3e",
  boss: "#805ad5",
};

export function StagePanel({
  stage,
  isStarting,
  onFight,
}: {
  stage: Stage;
  isStarting: boolean;
  onFight: () => void;
}) {
  const { isStageComplete, getStageStars } = useStory();
  const completed = isStageComplete(stage._id);
  const stars = getStageStars(stage._id);
  const diffColor = DIFFICULTY_COLORS[stage.difficulty ?? "easy"] ?? "#666";

  return (
    <motion.div
      className={`paper-panel p-5 md:p-6 transition-all ${completed ? "opacity-70" : ""}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: completed ? 0.7 : 1, x: 0 }}
      whileHover={{ x: 4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: "Special Elite, cursive", color: "#999" }}
            >
              Stage {stage.stageNumber}
            </span>
            {stage.difficulty && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border"
                style={{ borderColor: diffColor, color: diffColor }}
              >
                {stage.difficulty}
              </span>
            )}
            {completed && (
              <span className="text-[10px] font-bold text-[#38a169]">&#10003;</span>
            )}
          </div>

          <h2
            className="text-xl leading-tight mb-1"
            style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
          >
            {stage.title ?? stage.name ?? `Stage ${stage.stageNumber}`}
          </h2>

          <p
            className="text-sm text-[#666] leading-snug"
            style={{ fontFamily: "Special Elite, cursive" }}
          >
            {stage.description}
          </p>

          {stage.opponentName && (
            <p className="text-xs text-[#999] mt-2 uppercase tracking-wider">
              vs. {stage.opponentName}
            </p>
          )}

          {completed && (
            <div className="flex gap-0.5 mt-2">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className="text-sm"
                  style={{ color: n <= stars ? "#ffcc00" : "#ddd" }}
                >
                  &#9733;
                </span>
              ))}
            </div>
          )}

          {(stage.rewardGold || stage.rewardXp) && !completed && (
            <div className="flex gap-3 mt-2">
              {stage.rewardGold && (
                <span className="text-[10px] text-[#999] uppercase">
                  +{stage.rewardGold} gold
                </span>
              )}
              {stage.rewardXp && (
                <span className="text-[10px] text-[#999] uppercase">
                  +{stage.rewardXp} xp
                </span>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onFight}
          disabled={isStarting}
          className="tcg-button-primary px-5 py-2.5 text-sm shrink-0 disabled:opacity-50"
        >
          {isStarting ? "..." : completed ? "Replay" : "Fight"}
        </button>
      </div>
    </motion.div>
  );
}
