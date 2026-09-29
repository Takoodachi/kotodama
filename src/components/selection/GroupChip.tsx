"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

interface GroupChipProps {
  label: string;
  sublabel: string;
  selected: boolean;
  /** 0–1 share of this set's SRS progress, drawn as a gold hairline. */
  mastery: number;
  count?: number;
  wide?: boolean;
  onToggle: () => void;
}

export function GroupChip({ label, sublabel, selected, mastery, count, wide, onToggle }: GroupChipProps) {
  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      aria-label={`${label} ${sublabel}${count ? `, ${count} items` : ""}`}
      onClick={onToggle}
      whileTap={{ scale: 0.96 }}
      className={cn(
        "relative flex min-h-[76px] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border px-2 pt-2.5 pb-3.5 transition-[border-color,background-color,box-shadow] duration-300",
        wide && "items-start px-4",
        selected
          ? "border-crimson/70 bg-crimson/[0.09] shadow-[inset_0_0_0_1px_rgb(200_16_46/0.3),0_0_28px_-10px_rgb(200_16_46/0.8)]"
          : "border-line bg-veil/[0.02] hover:border-veil/20 hover:bg-veil/[0.04]",
      )}
    >
      <span className={cn("jp leading-tight text-paper", wide ? "text-xl" : "text-2xl")}>{label}</span>
      <span className="text-[11px] tracking-wide text-mist">
        {sublabel}
        {count !== undefined && <span className="text-smoke"> · {count}</span>}
      </span>

      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-crimson"
          >
            <Check className="size-2.5 text-on-accent" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>

      <span className="absolute inset-x-3 bottom-1.5 h-px bg-veil/[0.06]">
        <span
          className="bg-gold-metal absolute inset-y-0 left-0 transition-[width] duration-700"
          style={{ width: `${Math.round(mastery * 100)}%` }}
        />
      </span>
    </motion.button>
  );
}
