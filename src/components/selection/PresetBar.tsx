"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PRESETS } from "@/data/groups";
import { cn } from "@/lib/cn";

interface PresetBarProps {
  selected: ReadonlySet<string>;
  /** Adds (on) or removes (off) a preset's sets, keeping everything else selected. */
  onToggle: (groupIds: string[], on: boolean) => void;
  onClear: () => void;
}

/**
 * One-tap bundles of sets. Each is a toggle: several can be on at once
 * ("All hiragana" + "All katakana"), and one lights up whenever all of its
 * sets are selected, however they were picked.
 */
export function PresetBar({ selected, onToggle, onClear }: PresetBarProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
      {PRESETS.map((preset) => {
        const ids = preset.groups();
        const active = ids.every((id) => selected.has(id));
        return (
          <motion.button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(ids, !active)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs tracking-wide transition-[border-color,background-color,color,box-shadow] duration-300",
              active
                ? "border-crimson/80 bg-crimson/15 text-paper shadow-[0_0_22px_-4px_rgb(200_16_46/0.85),inset_0_0_0_1px_rgb(200_16_46/0.35)]"
                : "border-line text-mist hover:border-gold/50 hover:text-gold-bright",
            )}
          >
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex overflow-hidden"
                >
                  <Check className="size-3.5 text-crimson-bright" strokeWidth={3} />
                </motion.span>
              )}
            </AnimatePresence>
            {preset.label}
          </motion.button>
        );
      })}
      <button
        type="button"
        onClick={onClear}
        disabled={selected.size === 0}
        className="h-9 shrink-0 rounded-full px-4 text-xs tracking-wide text-smoke transition-colors hover:text-crimson-bright disabled:opacity-40 disabled:hover:text-smoke"
      >
        Clear all
      </button>
    </div>
  );
}
