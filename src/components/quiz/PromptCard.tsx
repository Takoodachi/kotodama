"use client";

import { AnimatePresence, motion } from "motion/react";
import { JpText, type RubyDisplay } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { speechText } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import {
  answerSide,
  promptSide,
  promptText,
  questionHint,
  type Direction,
  type Mode,
} from "@/lib/quiz/directions";
import type { FuriganaMode } from "@/store/settings";

interface PromptCardProps {
  item: StudyItem;
  direction: Direction;
  mode: Mode;
  furigana: FuriganaMode;
  /** null while unanswered. */
  correct: boolean | null;
  /** Ghost mode gets a pale, spectral edge. */
  ghost?: boolean;
  /** A card answered earlier, shown again: nothing to animate. */
  review?: boolean;
}

function jpSize(text: string): string {
  const length = [...text].length;
  if (length <= 2) return "text-[6.5rem] leading-none sm:text-[8.5rem]";
  if (length <= 4) return "text-6xl sm:text-7xl";
  if (length <= 8) return "text-4xl sm:text-5xl";
  if (length <= 14) return "text-3xl sm:text-4xl leading-[1.8]";
  return "text-2xl sm:text-3xl leading-[1.9]";
}

function latinSize(text: string): string {
  if (text.length <= 4) return "text-6xl sm:text-7xl";
  if (text.length <= 16) return "text-4xl sm:text-5xl";
  if (text.length <= 32) return "text-2xl sm:text-3xl";
  return "text-xl sm:text-2xl";
}

/**
 * Furigana on the prompt. When the question asks for the reading it stays
 * hidden until answered. Space is reserved so revealing it doesn't shift the text.
 */
function rubyFor(furigana: FuriganaMode, direction: Direction, answered: boolean): RubyDisplay {
  if (furigana === "hide") return "none";
  if (answered) return "show";
  return furigana === "after" || direction === "jp-romaji" ? "reserve" : "show";
}

export function PromptCard({ item, direction, mode, furigana, correct, ghost, review = false }: PromptCardProps) {
  const side = promptSide(direction);
  const answered = correct !== null;
  // The meaning appears once answered, unless it is the question or the answer itself.
  const meaning =
    side !== "en" && answerSide(direction) !== "en" && item.meaning.length ? promptText(item, "en") : null;
  // Hearing the word would give away a reading question, so the button waits for the answer.
  const canSpeak = side === "jp" ? direction !== "jp-romaji" || answered : answered;

  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-3xl px-5 pt-5 pb-10 text-center sm:px-10",
        ghost && "border-white/20 shadow-[0_0_60px_-20px_rgb(242_239_234/0.35),inset_0_0_40px_-20px_rgb(242_239_234/0.25)]",
      )}
    >
      <AnimatePresence initial={!review}>
        {answered && (
          <motion.div
            key={correct ? "right" : "wrong"}
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0",
              correct
                ? "bg-[radial-gradient(circle_at_50%_45%,rgb(201_164_92/0.22),transparent_65%)]"
                : "bg-[radial-gradient(circle_at_50%_45%,rgb(200_16_46/0.2),transparent_65%)]",
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-between gap-3">
        <p className="eyebrow text-left">{questionHint(item, direction, mode)}</p>
        <SpeakButton text={speechText(item)} locked={!canSpeak} />
      </div>

      <motion.div
        className="relative mt-6 flex min-h-[9rem] items-center justify-center sm:min-h-[11rem]"
        animate={correct === true && !review ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {side === "jp" ? (
          <JpText
            text={item.jp}
            ruby={rubyFor(furigana, direction, answered)}
            className={cn("text-paper", jpSize(item.surface))}
          />
        ) : side === "romaji" ? (
          <span className={cn("font-light tracking-wide text-paper", latinSize(promptText(item, "romaji")))}>
            {promptText(item, "romaji")}
          </span>
        ) : (
          <span className={cn("font-mincho text-paper", latinSize(promptText(item, "en")))}>
            {promptText(item, "en")}
          </span>
        )}
      </motion.div>

      {/* Space is kept from the start, so revealing the meaning doesn't move the options below. */}
      {meaning && (
        <p
          aria-hidden={!answered}
          className={cn(
            "relative mx-auto mt-3 -mb-4 max-w-md text-sm leading-relaxed text-mist transition-opacity duration-500",
            answered ? "opacity-100" : "invisible opacity-0",
          )}
        >
          {meaning}
        </p>
      )}
    </div>
  );
}
