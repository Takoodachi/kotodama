"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { JpText } from "@/components/japanese/Furigana";
import { romajiLabel, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { answersInJapanese, answerSide, type Mode, type Side } from "@/lib/quiz/directions";
import type { Question } from "@/lib/quiz/session";
import type { Script } from "@/lib/writing";
import type { AnswerResult } from "@/store/session";
import type { FuriganaMode } from "@/store/settings";
import { MultipleChoice } from "./MultipleChoice";
import { PromptCard } from "./PromptCard";

interface PastCardProps {
  item: StudyItem;
  question: Question;
  result: AnswerResult;
  mode: Mode;
  writing: readonly Script[];
  furigana: FuriganaMode;
  ghost: boolean;
}

/** An earlier card, as it was answered, to look at and listen to again. */
export function PastCard({ item: source, question, result, mode, writing, furigana, ghost }: PastCardProps) {
  const item = writtenItem(source, writing);
  return (
    <>
      <PromptCard
        item={item}
        direction={question.direction}
        mode={mode}
        furigana={furigana}
        correct={result.correct}
        ghost={ghost}
        review
      />
      {question.options ? (
        <MultipleChoice
          options={question.options}
          japanese={answersInJapanese(item, question.direction)}
          chosen={result.given}
          onChoose={() => {}}
          review
        />
      ) : result.parts ? (
        <div className="space-y-4">
          <TypedAnswer label="Reading" item={item} side="romaji" {...result.parts.reading} furigana={furigana} />
          <TypedAnswer label="Meaning" item={item} side="en" {...result.parts.meaning} furigana={furigana} />
        </div>
      ) : (
        <TypedAnswer
          item={item}
          side={answerSide(question.direction)}
          given={result.given}
          correct={result.correct}
          furigana={furigana}
        />
      )}
    </>
  );
}

function TypedAnswer({
  label,
  item,
  side,
  given,
  correct,
  furigana,
}: {
  /** Names the field when a card was answered in two. */
  label?: string;
  item: StudyItem;
  side: Side;
  given: string;
  correct: boolean;
  furigana: FuriganaMode;
}) {
  return (
    <div className="space-y-3 text-center">
      {label && <p className="-mb-1.5 pl-1 text-left text-[11px] tracking-[0.2em] text-smoke uppercase">{label}</p>}
      <p
        className={cn(
          "flex items-center justify-center rounded-2xl border bg-veil/[0.03] px-5 text-2xl text-paper",
          label ? "h-14" : "h-16",
          side === "jp" && "jp",
          correct ? "border-gold/80" : "border-crimson/80",
        )}
      >
        {given ? (
          <span className={cn(side === "jp" && "jp-scale")}>{given}</span>
        ) : (
          <span className="font-sans text-base text-smoke">No answer</span>
        )}
      </p>
      {!correct && (
        <p className="text-sm text-mist">
          Answer:{" "}
          {item.cloze ? (
            <JpText text={item.answer!} ruby="none" className="text-xl text-paper" />
          ) : side === "jp" ? (
            <JpText text={item.jp} ruby={furigana === "hide" ? "none" : "show"} className="text-xl text-paper" />
          ) : (
            <span className="text-paper">
              {side === "en"
                ? item.meaning.slice(0, 3).join("; ")
                : item.category === "kanji"
                  ? item.romaji.slice(0, 3).join(", ")
                  : romajiLabel(item)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

interface ReviewNavProps {
  /** Zero-based card being looked at, or null on the current question. */
  at: number | null;
  /** Zero-based position of the current question. */
  current: number;
  onBack: () => void;
  onForward: () => void;
  onReturn: () => void;
}

const navButton =
  "flex size-9 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-veil/25 hover:text-paper disabled:pointer-events-none disabled:opacity-30";

/** Steps back through the cards answered so far, and back to the current one. */
export function ReviewNav({ at, current, onBack, onForward, onReturn }: ReviewNavProps) {
  if (at === null) {
    return (
      <div className="flex h-10 items-center">
        <button
          type="button"
          onClick={onBack}
          disabled={current === 0}
          className="-ml-2 flex h-9 items-center gap-1 rounded-full pr-3 pl-2 text-xs text-mist transition-colors hover:bg-veil/5 hover:text-paper disabled:invisible"
        >
          <ChevronLeft className="size-4" />
          Previous card
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} disabled={at === 0} aria-label="Earlier card" className={navButton}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" onClick={onForward} aria-label="Later card" className={navButton}>
          <ChevronRight className="size-4" />
        </button>
        <span className="ml-1 text-xs text-mist tabular-nums" aria-live="polite">
          Card {at + 1}
        </span>
      </div>
      <button
        type="button"
        onClick={onReturn}
        className="flex h-9 items-center gap-1.5 rounded-full border border-gold/45 px-3.5 text-xs text-gold-bright transition-colors hover:border-gold hover:bg-gold/10"
      >
        Back to card {current + 1} <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}
