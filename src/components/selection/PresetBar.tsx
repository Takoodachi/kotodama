"use client";

import { PRESETS } from "@/data/groups";

export function PresetBar({ onApply, onClear }: { onApply: (groupIds: string[]) => void; onClear: () => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onApply(preset.groups())}
          className="h-9 shrink-0 rounded-full border border-line px-4 text-xs tracking-wide text-mist transition-colors hover:border-gold/50 hover:text-gold-bright"
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="h-9 shrink-0 rounded-full px-4 text-xs tracking-wide text-smoke transition-colors hover:text-crimson-bright"
      >
        Clear all
      </button>
    </div>
  );
}
