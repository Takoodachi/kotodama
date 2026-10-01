"use client";

import { Ghost } from "lucide-react";
import { ITEMS_BY_ID } from "@/data/library";
import { useHydrated } from "@/hooks/useHydrated";
import { GHOST_SIZE, useStartGhostMode } from "@/hooks/useStartSession";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/plural";
import { useProgress } from "@/store/progress";
import { useLibraryRevision } from "@/store/fetchedSets";

/**
 * Starts Ghost mode: a session made only of the items with the lowest
 * accuracy so far. Disabled until something has been answered.
 */
export function GhostModeButton({ className, compact }: { className?: string; compact?: boolean }) {
  const hydrated = useHydrated();
  // Recounted when a fetched set arrives: its words or kanji are in the library only then.
  useLibraryRevision();
  const studied = useProgress((s) => Object.keys(s.records).filter((id) => ITEMS_BY_ID.has(id)).length);
  const startGhost = useStartGhostMode();
  const available = hydrated && studied > 0;
  const count = Math.min(GHOST_SIZE, studied);

  return (
    <button
      type="button"
      onClick={startGhost}
      disabled={!available}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-veil/15 bg-veil/[0.03] text-left transition-[border-color,box-shadow,background-color] duration-500",
        "hover:border-veil/30 hover:bg-veil/[0.06] hover:shadow-[0_0_40px_-12px_rgb(242_239_234/0.45)]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-veil/15 disabled:hover:shadow-none",
        compact ? "px-4 py-2.5" : "p-4 sm:p-5",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-veil/15 bg-veil/[0.05] transition-transform duration-500 group-enabled:group-hover:-translate-y-0.5">
        <Ghost className="size-5 text-paper" strokeWidth={1.5} />
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-paper">Ghost mode</span>
          <span lang="ja" className="jp text-xs text-smoke">幽霊</span>
        </span>
        <span className="block text-xs leading-relaxed text-mist">
          {available
            ? `Drill your ${plural(count, "weakest item")}, lowest accuracy first`
            : "Answer a few questions first, then come back to haunt your weak spots"}
        </span>
      </span>
    </button>
  );
}
