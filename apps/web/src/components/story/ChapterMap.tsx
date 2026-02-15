import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { useStory } from "./StoryProvider";

const PANEL_LAYOUTS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

const container = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const panelVariant = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 15, stiffness: 200 },
  },
};

export function ChapterMap() {
  const navigate = useNavigate();
  const { chapters, isLoading, isChapterComplete, totalStars } = useStory();

  return (
    <div className="min-h-screen bg-[#fdfdfb] pb-24">
      <header className="border-b-2 border-[#121212] px-6 py-5">
        <div className="flex items-baseline justify-between">
          <div>
            <h1
              className="text-4xl tracking-tighter"
              style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
            >
              STORY MODE
            </h1>
            <p
              className="text-sm text-[#666] mt-1"
              style={{ fontFamily: "Special Elite, cursive" }}
            >
              Fight your way through the halls
            </p>
          </div>
          {totalStars > 0 && (
            <div className="text-right">
              <p
                className="text-2xl"
                style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, color: "#ffcc00" }}
              >
                &#9733; {totalStars}
              </p>
              <p className="text-[10px] text-[#999] uppercase tracking-wider">total stars</p>
            </div>
          )}
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !chapters || chapters.length === 0 ? (
          <div className="paper-panel p-12 text-center">
            <p className="text-[#666] font-bold uppercase text-sm">
              No chapters available yet.
            </p>
            <p
              className="text-xs text-[#999] mt-2"
              style={{ fontFamily: "Special Elite, cursive" }}
            >
              Check back soon — the school year has just begun.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-3 gap-3 md:gap-4 auto-rows-[140px] md:auto-rows-[180px]"
            variants={container}
            initial="hidden"
            animate="visible"
          >
            {chapters.map((chapter, i) => {
              const completed = isChapterComplete(chapter._id);
              const layout = PANEL_LAYOUTS[i % PANEL_LAYOUTS.length];
              const rotation = ((i * 7 + 3) % 5) - 2;

              return (
                <motion.button
                  key={chapter._id}
                  type="button"
                  onClick={() => navigate(`/story/${chapter._id}`)}
                  className={`comic-panel ${layout} relative overflow-hidden text-left cursor-pointer group`}
                  style={{ rotate: `${rotation}deg` }}
                  variants={panelVariant}
                  whileHover={{ scale: 1.03, rotate: 0, zIndex: 10 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {chapter.imageUrl && (
                    <img
                      src={chapter.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                      draggable={false}
                    />
                  )}

                  <div className="relative z-10 flex flex-col justify-between h-full p-4">
                    <div>
                      <span
                        className="text-[10px] text-[#999] uppercase tracking-wider block"
                        style={{ fontFamily: "Special Elite, cursive" }}
                      >
                        Chapter {chapter.chapterNumber ?? i + 1}
                      </span>
                      <h2
                        className="text-lg md:text-2xl leading-tight mt-0.5"
                        style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900 }}
                      >
                        {chapter.title}
                      </h2>
                      {chapter.description && (
                        <p
                          className="text-xs text-[#666] mt-1 leading-snug line-clamp-2"
                          style={{ fontFamily: "Special Elite, cursive" }}
                        >
                          {chapter.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {completed ? (
                        <span className="comic-stamp text-[#38a169] border-[#38a169]">
                          CLEARED
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#ffcc00] font-bold uppercase tracking-wider animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
