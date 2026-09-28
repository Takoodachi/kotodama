"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { Button } from "@/components/ui/Button";
import { speechText } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { cleanKanjiReading } from "@/lib/japanese";
import type { FuriganaMode } from "@/store/settings";

interface FeedbackPanelProps {
  item: StudyItem;
  correct: boolean;
  given: string;
  furigana: FuriganaMode;
  onContinue: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <dt className="w-20 shrink-0 pt-0.5 text-[11px] tracking-[0.16em] text-smoke uppercase">{label}</dt>
      <dd className="min-w-0 text-paper">{children}</dd>
    </div>
  );
}

/** Slides up after an answer with everything about the item. */
export function FeedbackPanel({ item, correct, given, furigana, onContinue }: FeedbackPanelProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const isKana = item.category === "hiragana" || item.category === "katakana";

  useEffect(() => {
    // Keeps Enter / Space working for "continue" without reaching for the mouse.
    continueRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="pb-safe fixed inset-x-0 bottom-0 z-40"
    >
      <div
        className={cn(
          "mx-auto max-w-2xl rounded-t-3xl border-x border-t bg-ink-900/95 px-5 pt-5 pb-5 backdrop-blur-xl sm:px-8",
          correct ? "border-gold/40" : "border-crimson/40",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn("flex items-baseline gap-2.5", correct ? "text-gold-bright" : "text-crimson-bright")}>
              <span className="jp text-2xl">{correct ? "正解" : "残念"}</span>
              <span className="text-xs tracking-[0.2em] uppercase">{correct ? "Correct" : "Not quite"}</span>
            </p>
            {!correct && (
              <p className="mt-1 text-xs text-mist">
                You answered: <span className="text-paper">{given || "—"}</span>
              </p>
            )}
          </div>
          <SpeakButton text={speechText(item)} />
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          <JpText
            text={item.jp}
            ruby={furigana === "hide" ? "none" : "show"}
            className={cn("shrink-0 text-paper", [...item.surface].length > 6 ? "text-2xl leading-[1.9]" : "text-5xl")}
          />
          <dl className="min-w-0 space-y-1.5">
            {!isKana && item.reading !== item.surface && item.category !== "kanji" && (
              <Row label="Reading">
                <span lang="ja" className="jp">{item.reading}</span>
              </Row>
            )}
            {item.category === "kanji" ? (
              <>
                {!!item.on?.length && (
                  <Row label="On'yomi">
                    <span lang="ja" className="jp">{item.on.join("、")}</span>
                  </Row>
                )}
                {!!item.kun?.length && (
                  <Row label="Kun'yomi">
                    <span lang="ja" className="jp">{item.kun.map(cleanKanjiReading).join("、")}</span>
                  </Row>
                )}
              </>
            ) : (
              <Row label="Romaji">{item.romaji.join(" / ")}</Row>
            )}
            {!!item.meaning.length && <Row label="Meaning">{item.meaning.join("; ")}</Row>}
          </dl>
        </div>

        <Button ref={continueRef} variant="primary" size="lg" className="mt-5 w-full" onClick={onContinue}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    </motion.section>
  );
}
