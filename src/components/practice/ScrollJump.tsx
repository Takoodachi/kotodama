"use client";

import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import { useEffect, useState } from "react";
import { isTyping } from "@/hooks/useHotkeys";
import { cn } from "@/lib/cn";
import { jumpTo } from "@/lib/scroll";

/** Two presses of an arrow key this close together (ms) count as one double press. */
const DOUBLE_PRESS = 400;
/** How near an end of the page counts as being there (px). */
const NEAR = 240;

/** Whether the page is scrolled to its top or its bottom. */
export interface ScrollEnds {
  top: boolean;
  bottom: boolean;
}

/** Where a long page is scrolled to, or null while the page is too short for that to matter. */
export function useScrollEnds(): ScrollEnds | null {
  const [ends, setEnds] = useState<ScrollEnds | null>(null);

  useEffect(() => {
    const measure = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const next = room < NEAR * 2 ? null : { top: window.scrollY < NEAR, bottom: window.scrollY > room - NEAR };
      // Nothing is drawn again unless an end was reached or left.
      setEnds((now) => (!now === !next && now?.top === next?.top && now?.bottom === next?.bottom ? now : next));
    };
    const first = setTimeout(measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    // The page grows and shrinks as sets arrive and panels open.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      clearTimeout(first);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  return ends;
}

/**
 * ↑ pressed twice goes to the top of the page, ↓ twice to the bottom. One
 * press still scrolls a little, as always.
 */
export function useArrowJump() {
  useEffect(() => {
    let last: { key: string; time: number } | null = null;
    const onKeyDown = (event: KeyboardEvent) => {
      const arrow = event.key === "ArrowUp" || event.key === "ArrowDown";
      const plain = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
      // In a field the arrows move the cursor; behind a dialog the page isn't what is being used.
      if (!arrow || !plain || isTyping(event.target) || document.querySelector('[role="dialog"]')) {
        last = null;
        return;
      }
      // A key held down is one long press, not many.
      if (event.repeat) return;
      if (last?.key === event.key && event.timeStamp - last.time < DOUBLE_PRESS) {
        event.preventDefault();
        last = null;
        jumpTo(event.key === "ArrowUp" ? "top" : "bottom");
      } else {
        last = { key: event.key, time: event.timeStamp };
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

const BUTTON =
  "flex items-center justify-center text-mist transition-colors hover:bg-veil/[0.06] hover:text-paper disabled:pointer-events-none disabled:opacity-30";

interface ScrollJumpProps {
  ends: ScrollEnds | null;
  /** Side by side, to sit in a bar; otherwise one above the other, to float at the edge of the page. */
  row?: boolean;
  className?: string;
}

/**
 * A pair of buttons for a long page: to its top, and to its bottom. They
 * stay away while the page is too short to need them.
 */
export function ScrollJump({ ends, row, className }: ScrollJumpProps) {
  if (!ends) return null;
  const size = row ? "h-full w-9" : "size-10";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full border border-line",
        row ? "h-8 divide-x divide-line" : "flex-col divide-y divide-line bg-ink-900/90 shadow-xl shadow-black/40 backdrop-blur-xl light:shadow-black/10",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => jumpTo("top")}
        disabled={ends.top}
        aria-label="Go to the top of the page"
        title="Top of the page (or press ↑ twice)"
        className={cn(BUTTON, size)}
      >
        <ArrowUpToLine className="size-4" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => jumpTo("bottom")}
        disabled={ends.bottom}
        aria-label="Go to the bottom of the page"
        title="Bottom of the page (or press ↓ twice)"
        className={cn(BUTTON, size)}
      >
        <ArrowDownToLine className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
