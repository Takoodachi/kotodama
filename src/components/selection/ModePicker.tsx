"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { MODE_INFO, type PracticeMode } from "@/lib/quiz/directions";

interface ModePickerProps {
  modes: PracticeMode[];
  value: PracticeMode;
  onChange: (mode: PracticeMode) => void;
}

export function ModePicker({ modes, value, onChange }: ModePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Quiz mode"
      className={cn("grid gap-2", modes.length === 4 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-2" : "grid-cols-3")}
    >
      {modes.map((mode) => {
        const info = MODE_INFO[mode];
        const selected = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${info.title}: ${info.description}`}
            title={info.description}
            onClick={() => onChange(mode)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3.5 text-center transition-colors duration-300",
              selected ? "border-transparent" : "border-line hover:border-veil/20",
            )}
          >
            {selected && (
              <motion.span
                layoutId="mode-picker-active"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-xl border border-crimson/70 bg-crimson/[0.09] shadow-[0_0_30px_-10px_rgb(200_16_46/0.8)]"
              />
            )}
            <span lang="ja" className={cn("jp relative text-3xl transition-colors", selected ? "text-paper" : "text-mist")}>
              {info.glyph}
            </span>
            <span className="relative text-[11px] leading-tight tracking-wide text-paper">{info.title}</span>
          </button>
        );
      })}
    </div>
  );
}
