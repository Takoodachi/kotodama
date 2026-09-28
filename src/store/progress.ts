import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { review, type SrsRecord } from "@/lib/srs";

interface Streak {
  count: number;
  /** Local date (YYYY-MM-DD) of the last practice. */
  lastDay: string | null;
}

interface ProgressState {
  records: Record<string, SrsRecord>;
  streak: Streak;
  totals: { answered: number; correct: number };

  /** Records an answer. Only first attempts move an item between SRS boxes. */
  record: (itemId: string, correct: boolean, firstAttempt: boolean) => void;
  reset: () => void;
}

function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextStreak(streak: Streak, now: Date): Streak {
  const today = localDay(now);
  if (streak.lastDay === today) return streak;
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return { count: streak.lastDay === yesterday ? streak.count + 1 : 1, lastDay: today };
}

/** The streak as it stands today: it lapses if yesterday was skipped. */
export function currentStreak(streak: Streak, now = new Date()): number {
  if (!streak.lastDay) return 0;
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return streak.lastDay === today || streak.lastDay === yesterday ? streak.count : 0;
}

const initial = {
  records: {},
  streak: { count: 0, lastDay: null },
  totals: { answered: 0, correct: 0 },
};

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...initial,
      record: (itemId, correct, firstAttempt) =>
        set((s) => {
          const now = new Date();
          return {
            records: firstAttempt
              ? { ...s.records, [itemId]: review(s.records[itemId], correct, now.getTime()) }
              : s.records,
            streak: nextStreak(s.streak, now),
            totals: {
              answered: s.totals.answered + 1,
              correct: s.totals.correct + (correct ? 1 : 0),
            },
          };
        }),
      reset: () => set(initial),
    }),
    {
      name: "kotodama-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
