"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { MODE_INFO, type Mode } from "@/lib/quiz/directions";

const MODES: Mode[] = ["choice", "reading", "typing"];

export function ModePicker({ value, onChange }: { value: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="radiogroup" aria-label="Quiz mode" className="grid grid-cols-3 gap-2">
      {MODES.map((mode) => {
        const info = MODE_INFO[mode];
        const selected = mode === value;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${info.title}: ${info.description}`}
            onClick={() => onChange(mode)}
            className={cn(
              "relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3.5 text-center transition-colors duration-300",
              selected ? "border-transparent" : "border-line hover:border-white/20",
            )}
          >
            {selected && (
              <motion.span
                layoutId="mode-picker-active"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="absolute inset-0 rounded-xl border border-crimson/70 bg-crimson/[0.09] shadow-[0_0_30px_-10px_rgb(200_16_46/0.8)]"
              />
            )}
            <span className={cn("jp relative text-3xl transition-colors", selected ? "text-paper" : "text-mist")}>
              {info.glyph}
            </span>
            <span className="relative text-[11px] leading-tight tracking-wide text-paper">{info.title}</span>
          </button>
        );
      })}
    </div>
  );
}
