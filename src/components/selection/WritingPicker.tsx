"use client";

import { Check } from "lucide-react";
import { JpText } from "@/components/japanese/Furigana";
import { cn } from "@/lib/cn";
import { ALL_SCRIPTS, SCRIPT_INFO, writeAs, type Script } from "@/lib/writing";
import type { FuriganaMode } from "@/store/settings";

const SAMPLE = "{私|わたし}はコーヒーを{飲|の}みます。";

interface WritingPickerProps {
  value: Script[];
  furigana: FuriganaMode;
  onToggle: (script: Script) => void;
}

/**
 * Which scripts words, phrases and sentences are written in. Any combination
 * works; the preview shows exactly what the quiz will look like.
 */
export function WritingPicker({ value, furigana, onToggle }: WritingPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {ALL_SCRIPTS.map((script) => {
          const on = value.includes(script);
          const last = on && value.length === 1;
          return (
            <button
              key={script}
              type="button"
              aria-pressed={on}
              aria-label={`${SCRIPT_INFO[script].en}${last ? " (at least one script stays on)" : ""}`}
              title={last ? "At least one script stays on" : undefined}
              onClick={() => onToggle(script)}
              className={cn(
                "relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors",
                on ? "border-gold/50 bg-gold/[0.07] text-gold-bright" : "border-line text-mist hover:border-white/20",
              )}
            >
              {on && <Check className="absolute top-1 right-1 size-3" strokeWidth={3} />}
              <span lang="ja" className="jp text-base leading-none">
                {SCRIPT_INFO[script].jp}
              </span>
              <span className="text-[10px] tracking-wide">{SCRIPT_INFO[script].en}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-center">
        <JpText
          text={writeAs(SAMPLE, value)}
          ruby={furigana === "hide" ? "none" : "show"}
          className="block text-lg leading-[2] text-paper"
        />
        <span className="block text-[10px] tracking-wide text-smoke">Preview · “I drink coffee.”</span>
      </div>
    </div>
  );
}
