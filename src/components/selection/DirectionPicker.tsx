"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { DIRECTION_LABELS, MODE_DIRECTIONS, type Direction, type Mode } from "@/lib/quiz/directions";

interface DirectionPickerProps {
  mode: Mode;
  enabled: Direction[];
  onToggle: (direction: Direction) => void;
}

export function DirectionPicker({ mode, enabled, onToggle }: DirectionPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MODE_DIRECTIONS[mode].map((direction) => {
        const on = enabled.includes(direction);
        const { from, to } = DIRECTION_LABELS[direction];
        return (
          <button
            key={direction}
            type="button"
            aria-pressed={on}
            aria-label={`${from} to ${to}`}
            onClick={() => onToggle(direction)}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs transition-colors",
              on ? "border-gold/50 bg-gold/[0.07] text-gold-bright" : "border-line text-mist hover:border-white/20",
            )}
          >
            <span className="jp">{from}</span>
            <ArrowRight className="size-3 opacity-60" />
            <span className="jp">{to}</span>
          </button>
        );
      })}
    </div>
  );
}
