"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { ExampleSentence } from "@/components/japanese/ExampleSentence";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { Button } from "@/components/ui/Button";
import { speechText, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { toSurface } from "@/lib/furigana";
import { cleanKanjiReading } from "@/lib/japanese";
import { scriptNames, type Script } from "@/lib/writing";
import type { AnswerPart, AnswerParts } from "@/store/session";
import { useSettings, type FuriganaMode } from "@/store/settings";

interface FeedbackPanelProps {
  item: StudyItem;
  /** Scripts words, phrases and sentences are shown in. */
  writing: readonly Script[];
  correct: boolean;
  given: string;
  /** A card answered with both its reading and its meaning. */
  parts?: AnswerParts;
  /** Counted as right by the learner after the check said wrong. */
  overruled?: boolean;
  /** Offered when a typed English answer was marked wrong: count it as right. */
  onOverrule?: () => void;
  furigana: FuriganaMode;
  onContinue: () => void;
}

/** One half of a "both" answer: what was typed, and whether it was right. */
function PartAnswer({ label, part }: { label: string; part: AnswerPart }) {
  return (
    <span className="flex items-center gap-1.5">
      {part.correct ? (
        <Check className="size-3.5 shrink-0 text-gold-bright" strokeWidth={2.5} />
      ) : (
        <X className="size-3.5 shrink-0 text-crimson-bright" strokeWidth={2.5} />
      )}
      {label}: <span className="text-paper">{part.given || "—"}</span>
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm">
      <dt className="w-20 shrink-0 pt-0.5 text-[11px] tracking-[0.16em] text-smoke uppercase">{label}</dt>
      <dd className="min-w-0 text-paper">{children}</dd>
    </div>
  );
}

/** Slides up after an answer with everything about the item, including an example sentence. */
export function FeedbackPanel({
  item: source,
  writing,
  correct,
  given,
  parts,
  overruled,
  onOverrule,
  furigana,
  onContinue,
}: FeedbackPanelProps) {
  const item = writtenItem(source, writing);
  const isKana = item.category === "hiragana" || item.category === "katakana";
  // Long items, or ones made long by a larger text size, get the full width.
  const jpSize = useSettings((s) => s.jpSize);
  const long = [...item.surface].length * jpSize > 6;

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
          "mx-auto max-h-[85dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl border-x border-t bg-ink-900/95 px-5 pt-5 pb-5 backdrop-blur-xl sm:px-8",
          correct ? "border-gold/40" : "border-crimson/40",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={cn("flex items-baseline gap-2.5", correct ? "text-gold-bright" : "text-crimson-bright")}>
              <span className="jp text-2xl">{correct ? "正解" : "残念"}</span>
              <span className="text-xs tracking-[0.2em] uppercase">{correct ? "Correct" : "Not quite"}</span>
            </p>
            {parts && (!correct || overruled) ? (
              <div className="mt-1 space-y-0.5 text-xs text-mist">
                <PartAnswer label="Reading" part={parts.reading} />
                <PartAnswer label="Meaning" part={parts.meaning} />
              </div>
            ) : (
              !correct && (
                <p className="mt-1 text-xs text-mist">
                  You answered: <span className="text-paper">{given || "—"}</span>
                </p>
              )
            )}
            {overruled && <p className="mt-1 text-xs text-mist">Counted as right.</p>}
            {onOverrule && (
              <button
                type="button"
                onClick={onOverrule}
                className="mt-2 h-8 rounded-full border border-line px-3.5 text-xs text-mist transition-colors hover:border-gold/50 hover:text-gold-bright"
              >
                I was right
              </button>
            )}
          </div>
          <SpeakButton text={speechText(item)} />
        </div>

        {/* Short items sit beside their details; sentences get the full width above them. */}
        <div className={cn("@container mt-4 flex flex-col gap-4", !long && "sm:flex-row sm:items-center sm:gap-8")}>
          <JpText
            text={item.jp}
            ruby={furigana === "hide" ? "none" : "show"}
            scale={long ? "wrap" : "fit"}
            className={cn("shrink-0 text-paper", long ? "text-2xl leading-[1.9]" : "text-5xl")}
          />
          <dl className="min-w-0 space-y-1.5">
            {!isKana && item.reading !== item.surface && item.category !== "kanji" && (
              <Row label="Reading">
                <JpText text={item.reading} ruby="none" />
              </Row>
            )}
            {item.category === "kanji" ? (
              <>
                {!!item.on?.length && (
                  <Row label="On'yomi">
                    <JpText text={item.on.join("、")} ruby="none" />
                  </Row>
                )}
                {!!item.kun?.length && (
                  <Row label="Kun'yomi">
                    <JpText text={item.kun.map(cleanKanjiReading).join("、")} ruby="none" />
                  </Row>
                )}
              </>
            ) : (
              <Row label="Romaji">{item.romaji.join(" / ")}</Row>
            )}
            {!!item.meaning.length && <Row label="Meaning">{item.meaning.join("; ")}</Row>}
            {item.note && <Row label="Note">{item.note}</Row>}
            {item.usual && (
              <Row label="Usually">
                <JpText text={item.usual} ruby={furigana === "hide" ? "none" : "show"} className="text-base" />
                <span className="ml-2 text-xs text-mist">written in {scriptNames(toSurface(item.usual))}</span>
              </Row>
            )}
          </dl>
        </div>

        <ExampleSentence key={item.id} item={source} writing={writing} furigana={furigana} className="mt-4" />

        <Button variant="primary" size="lg" className="mt-5 w-full" onClick={onContinue}>
          Continue <ArrowRight className="size-4" />
          <kbd className="ml-1 hidden rounded border border-veil/25 px-1.5 py-0.5 font-sans text-[10px] tracking-wide text-paper/80 pointer-fine:inline">
            Enter
          </kbd>
        </Button>
      </div>
    </motion.section>
  );
}
