"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { bind, unbind } from "wanakana";
import { Button } from "@/components/ui/Button";
import type { StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import { answerSide, type Direction, type Side } from "@/lib/quiz/directions";

interface AnswerInputProps {
  item: StudyItem;
  direction: Direction;
  /** Convert typed romaji to kana in the field, for learners without a Japanese keyboard. */
  kanaConverter: boolean;
  /** null while unanswered. */
  correct: boolean | null;
  /** A card answered with both its reading and its meaning: whether each was right, once answered. */
  parts?: { reading: boolean; meaning: boolean };
  /** The answer; for a "both" card, the reading and then the meaning. */
  onSubmit: (given: string, meaning?: string) => void;
  onContinue: () => void;
  /** Text typed in each field before it was last closed, e.g. to look back at an earlier card. */
  draft?: string[];
  onDraft?: (texts: string[]) => void;
}

const PLACEHOLDERS = { romaji: "romaji…", en: "English…", jp: "日本語…" } as const;
const FIELD_NAMES = { romaji: "Reading", en: "Meaning", jp: "Japanese" } as const;

export function AnswerInput({
  item,
  direction,
  kanaConverter,
  correct,
  parts,
  onSubmit,
  onContinue,
  draft,
  onDraft,
}: AnswerInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const both = direction === "jp-both";
  // A "both" card has a field for the reading and one for the meaning.
  const sides: Side[] = both ? ["romaji", "en"] : [answerSide(direction)];
  const answered = correct !== null;
  const convert = sides[0] === "jp" && kanaConverter;
  const verdicts = both ? [parts?.reading ?? null, parts?.meaning ?? null] : [correct];

  useEffect(() => {
    const input = inputs.current[0];
    if (!input || !convert) return;
    bind(input, { IMEMode: item.category === "katakana" ? "toKatakana" : "toHiragana" });
    return () => unbind(input);
  }, [convert, item.category]);

  const values = () => inputs.current.map((input) => input?.value.trim() ?? "");

  // Keep what was typed when the fields close, so it's still there on return.
  const saveDraft = useRef(onDraft);
  useEffect(() => {
    saveDraft.current = onDraft;
  });
  useEffect(() => {
    const fields = inputs.current;
    return () => saveDraft.current?.(fields.map((input) => input?.value ?? ""));
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (answered) return onContinue();
    const [first, second = ""] = values();
    if (!both) {
      if (first) onSubmit(first);
    } else if (first || second) {
      onSubmit(first, second);
    }
  };

  /** With two fields, Enter moves to the other one while it's empty, and checks once both are filled. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, at: number) => {
    if (!both || answered || event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const other = at === 0 ? 1 : 0;
    if (values()[other]) return;
    event.preventDefault();
    inputs.current[other]?.focus();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <motion.div
        animate={correct === false ? { x: [0, -10, 10, -7, 7, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-3"
      >
        {sides.map((side, at) => {
          const verdict = verdicts[at];
          const language = side === "jp" ? "Japanese" : side === "en" ? "English" : "romaji";
          const field = (
            <input
              ref={(input) => {
                inputs.current[at] = input;
              }}
              autoFocus={at === 0}
              defaultValue={draft?.[at]}
              readOnly={answered}
              lang={side === "jp" ? "ja" : "en"}
              aria-label={both ? `Your ${FIELD_NAMES[side].toLowerCase()} in ${language}` : `Your answer in ${language}`}
              placeholder={convert ? "type romaji → かな" : PLACEHOLDERS[side]}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint={answered || (both && at === 0) ? "next" : "done"}
              onKeyDown={(event) => onKeyDown(event, at)}
              className={cn(
                "w-full rounded-2xl border bg-veil/[0.03] px-5 text-center text-paper outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-smoke",
                both ? "h-14" : "h-16",
                // Japanese follows the text size setting.
                side === "jp" ? "jp text-[length:calc(var(--text-2xl)*var(--jp-scale,1))]" : "text-2xl",
                verdict === true && "border-gold/80 shadow-[0_0_36px_-10px_rgb(201_164_92/0.9)]",
                verdict === false && "border-crimson/80",
                verdict === null && "border-line focus:border-veil/30",
              )}
            />
          );
          if (!both) return <div key={side}>{field}</div>;
          return (
            <div key={side}>
              <p className="mb-1.5 flex items-center gap-1.5 pl-1 text-[11px] tracking-[0.2em] text-smoke uppercase">
                {FIELD_NAMES[side]}
                {verdict === true && <Check className="size-3.5 text-gold-bright" strokeWidth={2.5} />}
                {verdict === false && <X className="size-3.5 text-crimson-bright" strokeWidth={2.5} />}
              </p>
              {field}
            </div>
          );
        })}
      </motion.div>
      {/* Hidden rather than removed after answering, so the card doesn't jump. */}
      <div className={cn("flex gap-3", answered && "invisible")} aria-hidden={answered}>
        <Button
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={() => (both ? onSubmit("", "") : onSubmit(""))}
          tabIndex={answered ? -1 : 0}
        >
          I don&apos;t know
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1" tabIndex={answered ? -1 : 0}>
          Check
        </Button>
      </div>
    </form>
  );
}
