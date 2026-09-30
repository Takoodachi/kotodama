"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
import { JpText } from "@/components/japanese/Furigana";
import { useHotkeys } from "@/hooks/useHotkeys";
import { cn } from "@/lib/cn";
import type { ChoiceOption } from "@/lib/quiz/distractors";

interface MultipleChoiceProps {
  options: ChoiceOption[];
  japanese: boolean;
  /** Label of the option picked, once answered. */
  chosen: string | null;
  onChoose: (option: ChoiceOption) => void;
  /** A card answered earlier, shown again: nothing to animate. */
  review?: boolean;
}

export function MultipleChoice({ options, japanese, chosen, onChoose, review = false }: MultipleChoiceProps) {
  const answered = chosen !== null;
  const longest = Math.max(...options.map((o) => o.label.length));
  // Japanese answers sit two to a row only when the longest still fits on one line at the
  // chosen text size (1.5rem a character, plus the padding); otherwise one to a row.
  const columns: React.CSSProperties | undefined = japanese
    ? {
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, max(calc(${longest} * 1.5rem * var(--jp-scale, 1) + 2.25rem), calc(50% - 0.375rem))), 1fr))`,
      }
    : undefined;

  useHotkeys(
    Object.fromEntries(options.map((option, i) => [String(i + 1), () => onChoose(option)])),
    !answered,
  );

  return (
    <div
      role="group"
      aria-label="Answer options"
      style={columns}
      className={cn("grid gap-3", !japanese && (longest > 22 ? "grid-cols-1" : "grid-cols-2"))}
    >
      {options.map((option, i) => {
        const isChosen = answered && option.label === chosen;
        const reveal = answered && option.correct;
        const wrongPick = isChosen && !option.correct;
        return (
          <motion.button
            key={`${option.itemId}-${i}`}
            type="button"
            disabled={answered}
            onClick={() => onChoose(option)}
            initial={review ? false : { opacity: 0, y: 14 }}
            animate={
              wrongPick && !review
                ? { opacity: 1, y: 0, x: [0, -10, 10, -7, 7, -3, 0] }
                : {
                    // Dimmed less when there's a meaning to read.
                    opacity: answered && !reveal && !wrongPick ? (option.meaning ? 0.55 : 0.35) : 1,
                    y: 0,
                    x: 0,
                    scale: reveal && !review ? [1, 1.04, 1] : 1,
                  }
            }
            transition={{
              opacity: { duration: 0.3, delay: answered ? 0 : 0.05 * i },
              y: { duration: 0.45, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] },
              x: { duration: 0.45 },
              scale: { duration: 0.45 },
            }}
            whileTap={answered ? undefined : { scale: 0.97 }}
            className={cn(
              "relative flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-4 py-3 text-center transition-[border-color,background-color,box-shadow] duration-300",
              !answered && "border-line bg-veil/[0.025] hover:border-veil/25 hover:bg-veil/[0.05]",
              reveal && "border-gold/80 bg-gold/[0.1] shadow-[0_0_36px_-10px_rgb(201_164_92/0.9)]",
              wrongPick && "border-crimson/80 bg-crimson/[0.12]",
              answered && !reveal && !wrongPick && "border-line",
            )}
          >
            <span className="absolute top-2 left-3 hidden text-[10px] text-smoke tabular-nums sm:block">{i + 1}</span>
            {reveal && <Check className="absolute top-2.5 right-3 size-4 text-gold-bright" strokeWidth={2.5} />}
            {wrongPick && <X className="absolute top-2.5 right-3 size-4 text-crimson-bright" strokeWidth={2.5} />}
            <span
              className={cn(
                "text-paper",
                // Japanese breaks between phrases where the browser can, in lines of even length.
                japanese ? "text-2xl [text-wrap:balance] [word-break:auto-phrase]" : "text-base",
              )}
            >
              {japanese ? <JpText text={option.label} ruby="none" /> : option.label}
            </span>
            {option.sublabel && <span className="mt-0.5 text-xs text-mist">{option.sublabel}</span>}
            {/* Space is kept for the meaning from the start, so revealing it doesn't move the options. */}
            {option.meaning && (
              <span
                aria-hidden={!answered}
                className={cn(
                  "mt-1 text-xs leading-snug text-mist transition-opacity duration-500",
                  answered ? "opacity-100" : "invisible opacity-0",
                )}
              >
                {option.meaning}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
