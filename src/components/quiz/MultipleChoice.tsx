"use client";

import { Check, X } from "lucide-react";
import { motion } from "motion/react";
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
  const singleColumn = longest > (japanese ? 9 : 22);

  useHotkeys(
    Object.fromEntries(options.map((option, i) => [String(i + 1), () => onChoose(option)])),
    !answered,
  );

  return (
    <div role="group" aria-label="Answer options" className={cn("grid gap-3", singleColumn ? "grid-cols-1" : "grid-cols-2")}>
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
              !answered && "border-line bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]",
              reveal && "border-gold/80 bg-gold/[0.1] shadow-[0_0_36px_-10px_rgb(201_164_92/0.9)]",
              wrongPick && "border-crimson/80 bg-crimson/[0.12]",
              answered && !reveal && !wrongPick && "border-line",
            )}
          >
            <span className="absolute top-2 left-3 hidden text-[10px] text-smoke tabular-nums sm:block">{i + 1}</span>
            {reveal && <Check className="absolute top-2.5 right-3 size-4 text-gold-bright" strokeWidth={2.5} />}
            {wrongPick && <X className="absolute top-2.5 right-3 size-4 text-crimson-bright" strokeWidth={2.5} />}
            <span lang={japanese ? "ja" : undefined} className={cn("text-paper", japanese ? "jp text-2xl" : "text-base")}>
              {option.label}
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
