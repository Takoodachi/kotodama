"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Accessible name when the label is an icon or glyph. */
  title?: string;
}

interface SegmentedControlProps<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative flex rounded-full border border-line bg-white/[0.02] p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex h-9 flex-1 items-center justify-center rounded-full px-3 text-xs tracking-wide transition-colors duration-300",
              selected ? "text-paper" : "text-mist hover:text-paper",
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full border border-white/10 bg-white/[0.08]"
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
