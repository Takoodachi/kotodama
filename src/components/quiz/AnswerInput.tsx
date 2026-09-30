"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { bind, unbind } from "wanakana";
import { Button } from "@/components/ui/Button";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { answerSide, type Direction } from "@/lib/quiz/directions";

interface AnswerInputProps {
  item: StudyItem;
  direction: Direction;
  /** Convert typed romaji to kana in the field, for learners without a Japanese keyboard. */
  kanaConverter: boolean;
  /** null while unanswered. */
  correct: boolean | null;
  onSubmit: (given: string) => void;
  onContinue: () => void;
  /** Text typed before the field was last closed, e.g. to look back at an earlier card. */
  draft?: string;
  onDraft?: (text: string) => void;
}

const PLACEHOLDERS = { romaji: "romaji…", en: "English…", jp: "日本語…" } as const;

export function AnswerInput({
  item,
  direction,
  kanaConverter,
  correct,
  onSubmit,
  onContinue,
  draft,
  onDraft,
}: AnswerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const side = answerSide(direction);
  const answered = correct !== null;
  const convert = side === "jp" && kanaConverter;

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !convert) return;
    bind(input, { IMEMode: item.category === "katakana" ? "toKatakana" : "toHiragana" });
    return () => unbind(input);
  }, [convert, item.category]);

  // Keep what was typed when the field closes, so it's still there on return.
  const saveDraft = useRef(onDraft);
  useEffect(() => {
    saveDraft.current = onDraft;
  });
  useEffect(() => {
    const input = inputRef.current;
    return () => {
      if (input) saveDraft.current?.(input.value);
    };
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (answered) return onContinue();
    const value = inputRef.current?.value.trim() ?? "";
    if (value) onSubmit(value);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <motion.div
        animate={correct === false ? { x: [0, -10, 10, -7, 7, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
      >
        <input
          ref={inputRef}
          autoFocus
          defaultValue={draft}
          readOnly={answered}
          lang={side === "jp" ? "ja" : "en"}
          aria-label={`Your answer in ${side === "jp" ? "Japanese" : side === "en" ? "English" : "romaji"}`}
          placeholder={convert ? "type romaji → かな" : PLACEHOLDERS[side]}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint={answered ? "next" : "done"}
          className={cn(
            "h-16 w-full rounded-2xl border bg-veil/[0.03] px-5 text-center text-paper outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-smoke",
            // Japanese follows the text size setting.
            side === "jp" ? "jp text-[length:calc(var(--text-2xl)*var(--jp-scale,1))]" : "text-2xl",
            correct === true && "border-gold/80 shadow-[0_0_36px_-10px_rgb(201_164_92/0.9)]",
            correct === false && "border-crimson/80",
            correct === null && "border-line focus:border-veil/30",
          )}
        />
      </motion.div>
      {/* Hidden rather than removed after answering, so the card doesn't jump. */}
      <div className={cn("flex gap-3", answered && "invisible")} aria-hidden={answered}>
        <Button variant="ghost" size="lg" className="flex-1" onClick={() => onSubmit("")} tabIndex={answered ? -1 : 0}>
          I don&apos;t know
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1" tabIndex={answered ? -1 : 0}>
          Check
        </Button>
      </div>
    </form>
  );
}
