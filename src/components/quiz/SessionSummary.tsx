"use client";

import { RotateCcw, Target } from "lucide-react";
import { motion } from "motion/react";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { Button, LinkButton } from "@/components/ui/Button";
import { ITEMS_BY_ID, romajiLabel, speechText } from "@/data/library";
import type { AnswerResult } from "@/store/session";

interface SessionSummaryProps {
  results: AnswerResult[];
  onPracticeMissed: (itemIds: string[]) => void;
  onRepeat: () => void;
}

function verdict(accuracy: number): { jp: string; en: string } {
  if (accuracy >= 0.9) return { jp: "見事", en: "Superb" };
  if (accuracy >= 0.7) return { jp: "上手", en: "Well done" };
  if (accuracy >= 0.4) return { jp: "その調子", en: "Keep it up" };
  return { jp: "七転び八起き", en: "Fall seven times, rise eight" };
}

function AccuracyRing({ value }: { value: number }) {
  const radius = 54;
  return (
    <div className="relative size-40">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--chart-grid)" strokeWidth="3" />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--color-crimson)" }} />
            <stop offset="100%" style={{ stopColor: "var(--heat-4)" }} />
          </linearGradient>
        </defs>
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mincho text-4xl text-paper tabular-nums">{Math.round(value * 100)}%</span>
        <span className="eyebrow mt-1 text-[9px]">Accuracy</span>
      </div>
    </div>
  );
}

export function SessionSummary({ results, onPracticeMissed, onRepeat }: SessionSummaryProps) {
  // Accuracy counts first attempts only; re-asked cards are practice.
  const first = results.filter((r) => r.attempt === 0);
  const correct = first.filter((r) => r.correct).length;
  const accuracy = first.length ? correct / first.length : 0;
  const missedIds = [...new Set(results.filter((r) => !r.correct).map((r) => r.itemId))];
  const { jp, en } = verdict(accuracy);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex flex-col items-center text-center">
        <AccuracyRing value={accuracy} />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <span lang="ja" className="jp block text-4xl text-paper">{jp}</span>
          <span className="eyebrow mt-2 block">{en}</span>
        </motion.h1>
        <p className="mt-4 text-sm text-mist tabular-nums">
          {correct} of {first.length} right on the first try · {results.length} answers in total
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {missedIds.length > 0 && (
          <Button variant="primary" size="lg" className="w-full" onClick={() => onPracticeMissed(missedIds)}>
            <Target className="size-4" /> Practice the {missedIds.length} you missed
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" size="lg" className="px-4" onClick={onRepeat}>
            <RotateCcw className="size-4" /> Again
          </Button>
          <LinkButton href="/practice" variant="ghost" size="lg" className="px-4">
            Choose sets
          </LinkButton>
        </div>
      </div>

      {missedIds.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">To review</h2>
          <ul className="glass divide-y divide-line rounded-2xl">
            {missedIds.map((id, i) => {
              const item = ITEMS_BY_ID.get(id);
              if (!item) return null;
              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.04 }}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <JpText text={item.jp} className="min-w-14 text-2xl text-paper" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-paper">{item.meaning.join("; ") || romajiLabel(item)}</p>
                    <p className="truncate text-xs text-mist">{romajiLabel(item)}</p>
                  </div>
                  <SpeakButton text={speechText(item)} size="sm" />
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
