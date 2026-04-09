import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, PlayCircle, X } from "lucide-react";
import { useApp } from "../context/AppContext";

export const TutorialWelcome: React.FC = () => {
  const {
    isTutorialWelcomeOpen,
    isTutorialWelcomeSkippable,
    beginTutorial,
    closeTutorialWelcome,
  } = useApp();

  return (
    <AnimatePresence>
      {isTutorialWelcomeOpen && (
        <motion.div
          className="fixed inset-0 z-[110]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              className="w-full max-w-sm rounded-[32px] bg-white shadow-2xl border border-gray-100 overflow-hidden"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <div className="relative px-7 pt-8 pb-7 bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 text-white">
                {isTutorialWelcomeSkippable && (
                  <div className="absolute top-4 right-4">
                    <button
                      type="button"
                      onClick={closeTutorialWelcome}
                      className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
                      aria-label="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                  <Sparkles size={28} />
                </div>

                <h2 className="text-2xl font-black leading-tight mb-2">
                  Vamos começar o tutorial?
                </h2>
                <p className="text-white/90 text-sm leading-relaxed">
                  Em poucos passos você vai conhecer as principais telas e como
                  usar o app no dia a dia.
                </p>
              </div>

              <div className="p-6 space-y-3">
                <button
                  type="button"
                  onClick={beginTutorial}
                  className="w-full h-12 rounded-2xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                >
                  <PlayCircle size={20} />
                  Começar tutorial
                </button>

                {isTutorialWelcomeSkippable && (
                  <button
                    type="button"
                    onClick={closeTutorialWelcome}
                    className="w-full h-12 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Agora não
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
