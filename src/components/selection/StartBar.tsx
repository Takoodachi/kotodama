"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MODE_INFO, type Mode } from "@/lib/quiz/directions";

interface StartBarProps {
  itemCount: number;
  mode: Mode;
  sessionLength: number;
  onStart: () => void;
  /** Docked in the sidebar on wide screens, floating above the tab bar otherwise. */
  docked?: boolean;
}

export function StartBar({ itemCount, mode, sessionLength, onStart, docked }: StartBarProps) {
  const empty = itemCount === 0;
  const summary = empty
    ? "Select at least one set"
    : `${MODE_INFO[mode].title} · ${sessionLength ? `${sessionLength} questions` : "endless"}`;

  const bar = (
    <div
      className={cn(
        "glass flex items-center justify-between gap-4 rounded-2xl p-3 pl-5",
        // Floating over scrolling content, the bar needs a solid backing to stay legible.
        !docked && "bg-ink-900/95 shadow-2xl shadow-black/60",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm text-paper tabular-nums">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
        <p className="truncate text-xs text-mist">{summary}</p>
      </div>
      <Button variant="primary" size="lg" split="Begin" onClick={onStart} disabled={empty} className="shrink-0">
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );

  if (docked) return bar;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-3 md:bottom-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto max-w-xl">{bar}</div>
    </div>
  );
}
