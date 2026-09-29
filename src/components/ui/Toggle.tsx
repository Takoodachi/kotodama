"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/** A labelled on/off switch row. */
export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-6 py-3 text-left"
    >
      <span>
        <span className="block text-sm text-paper">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-mist">{description}</span>}
      </span>
      <span
        className={cn(
          "relative flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-300",
          checked ? "border-crimson bg-crimson/80" : "border-line bg-veil/[0.04]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={cn("size-5.5 rounded-full shadow", checked ? "ml-auto bg-on-accent" : "ml-0 bg-paper")}
        />
      </span>
    </button>
  );
}
