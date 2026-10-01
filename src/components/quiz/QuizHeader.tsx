"use client";

import { BookOpen, Flame, Ghost, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MuteButton } from "@/components/ui/MuteButton";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface QuizHeaderProps {
  /** Zero-based position of the current card. */
  position: number;
  done: number;
  total: number;
  endless: boolean;
  correct: number;
  /** Correct answers in a row. */
  streak: number;
  /** Ghost mode: drilling the weakest items. */
  ghost?: boolean;
  /** Opens the dictionary of unlocked entries; given when the session has words, phrases or sentences. */
  onDictionary?: () => void;
  /** Entries unlocked so far this session, shown on the dictionary button. */
  unlocked?: number;
  onClose: () => void;
}

export function QuizHeader({
  position,
  done,
  total,
  endless,
  correct,
  streak,
  ghost,
  onDictionary,
  unlocked = 0,
  onClose,
}: QuizHeaderProps) {
  return (
    <header className="pt-safe">
      <div className="flex h-14 items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="End session"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
        >
          <X className="size-5" strokeWidth={1.5} />
        </button>
        {ghost && (
          <span className="flex items-center gap-1.5 rounded-full border border-veil/15 bg-veil/[0.06] px-2.5 py-1 text-[10px] tracking-[0.18em] text-paper uppercase shadow-[0_0_18px_-4px_rgb(242_239_234/0.5)]">
            <Ghost className="size-3" /> Ghost
          </span>
        )}
        <div className="flex-1">
          <ProgressBar value={endless ? (done ? correct / done : 0) : done / Math.max(total, 1)} />
        </div>
        <AnimatePresence>
          {streak >= 3 && (
            <motion.span
              key="streak"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="flex items-center gap-1 text-xs text-gold-bright tabular-nums"
              aria-label={`${streak} in a row`}
            >
              <Flame className="size-3.5" />
              {streak}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="min-w-12 text-right text-xs text-mist tabular-nums">
          {endless ? `${correct} / ${done}` : `${Math.min(position + 1, total)} / ${total}`}
        </span>
        {onDictionary && (
          <button
            type="button"
            onClick={onDictionary}
            aria-label={`Open my dictionary${unlocked ? ` (${unlocked} new this session)` : ""}`}
            title="My dictionary: the words you've unlocked"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-gold/50 hover:text-gold-bright"
          >
            <BookOpen className="size-[18px]" strokeWidth={1.6} />
            {unlocked > 0 && (
              <motion.span
                // Pops each time another entry is unlocked.
                key={unlocked}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-medium text-ink-950 tabular-nums"
              >
                +{unlocked}
              </motion.span>
            )}
          </button>
        )}
        <MuteButton className="-mr-1" />
      </div>
    </header>
  );
}
