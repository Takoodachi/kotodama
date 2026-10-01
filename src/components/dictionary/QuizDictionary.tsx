"use client";

import { BookOpen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { DICTIONARY, unlockedEntries } from "@/lib/dictionary";
import { useProgress } from "@/store/progress";
import { DictionaryBrowser } from "./DictionaryBrowser";

interface QuizDictionaryProps {
  open: boolean;
  onClose: () => void;
  /** The card being asked, left out until it's answered so it can't simply be looked up. */
  hidden?: string;
}

/**
 * The dictionary as it can be used during a quiz: only the entries already
 * unlocked by a right answer. It starts empty and fills up as words are
 * learned, so looking something up means having known it once.
 */
export function QuizDictionary({ open, onClose, hidden }: QuizDictionaryProps) {
  const records = useProgress((s) => s.records);
  const unlocked = useMemo(() => unlockedEntries(records), [records]);

  // Esc closes; focus goes back to where it was (the answer field, usually).
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      before?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="quiz-dictionary"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-dictionary-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="pb-safe relative flex h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-ink-900/95 shadow-2xl backdrop-blur-xl sm:h-[80dvh] sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-7 sm:pt-6">
              <div>
                <p className="eyebrow flex items-center gap-2">
                  <BookOpen className="size-3.5 text-gold" /> 辞書 · My dictionary
                </p>
                <h2 id="quiz-dictionary-title" className="mt-1.5 font-mincho text-2xl text-paper">
                  {unlocked.size.toLocaleString("en")}{" "}
                  <span className="text-base text-mist">of {DICTIONARY.length.toLocaleString("en")} unlocked</span>
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-mist">
                  Only what you&apos;ve got right before is here. The card you&apos;re on stays hidden until you
                  answer it.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close the dictionary"
                className="-mt-1 -mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-7">
              <DictionaryBrowser
                unlocked={unlocked}
                scope="unlocked"
                hidden={hidden}
                autoFocus
                controlsClassName="sticky top-0 z-10 -mx-5 bg-ink-900/95 px-5 pb-3 backdrop-blur-xl sm:-mx-7 sm:px-7"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
