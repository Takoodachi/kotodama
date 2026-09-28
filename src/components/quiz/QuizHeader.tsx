"use client";

import { Flame, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  onClose: () => void;
}

export function QuizHeader({ position, done, total, endless, correct, streak, onClose }: QuizHeaderProps) {
  return (
    <header className="pt-safe">
      <div className="flex h-14 items-center gap-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="End session"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-paper"
        >
          <X className="size-5" strokeWidth={1.5} />
        </button>
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
      </div>
    </header>
  );
}
