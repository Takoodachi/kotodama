"use client";

import { ArrowRight } from "lucide-react";
import type { Category } from "@/data/types";
import { cn } from "@/lib/cn";
import {
  DIRECTION_LABELS,
  directionDescription,
  directionLimits,
  MODE_DIRECTIONS,
  type Direction,
  type Mode,
} from "@/lib/quiz/directions";

interface DirectionPickerProps {
  mode: Mode;
  enabled: Direction[];
  onToggle: (direction: Direction) => void;
  /** Kinds of item selected, to explain which can't be asked every way. */
  categories: Iterable<Category>;
}

function DirectionName({ direction }: { direction: Direction }) {
  const { from, to } = DIRECTION_LABELS[direction];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="jp">{from}</span>
      <ArrowRight className="size-3 opacity-60" />
      <span className="jp">{to}</span>
    </span>
  );
}

export function DirectionPicker({ mode, enabled, onToggle, categories }: DirectionPickerProps) {
  const limits = directionLimits(categories, mode, enabled);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {MODE_DIRECTIONS[mode].map((direction) => {
          const on = enabled.includes(direction);
          const { from, to } = DIRECTION_LABELS[direction];
          const description = directionDescription(direction, mode);
          return (
            <button
              key={direction}
              type="button"
              aria-pressed={on}
              aria-label={`${from} to ${to}: ${description}`}
              onClick={() => onToggle(direction)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                on ? "border-gold/50 bg-gold/[0.07]" : "border-line hover:border-veil/20",
              )}
            >
              <span className={cn("text-xs", on ? "text-gold-bright" : "text-paper")}>
                <DirectionName direction={direction} />
              </span>
              <span className="text-[11px] leading-snug text-mist">{description}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-smoke">
        Turn on one or more. Each card is asked one of the ways that are on, picked at random.
      </p>
      {[...categories].includes("grammar") && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-smoke">
          <span className="text-mist">Grammar</span> is always fill-in-the-gap, with the translation as a hint.
        </p>
      )}
      {limits.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-smoke">
          {limits.map(({ label, used, reason }) => (
            <li key={label}>
              <span className="text-mist">{label}</span> are only asked{" "}
              {used.map((d, i) => (
                <span key={d}>
                  {i > 0 && " or "}
                  <span className="text-mist">
                    <DirectionName direction={d} />
                  </span>
                </span>
              ))}
              , because {reason}.
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
