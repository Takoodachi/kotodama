"use client";

import { cn } from "@/lib/cn";
import { useKanaChart } from "@/store/kanaChart";
import { useSettings } from "@/store/settings";

const BUTTON =
  "h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-full border text-xs transition-colors sm:px-3";
const IDLE = "border-line text-mist hover:border-veil/25 hover:text-paper";
const ON = "border-veil/25 bg-veil/[0.08] text-paper";

/** A click here isn't leaving the field being typed in: the caret stays where it is. */
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

function Face() {
  return (
    <>
      <span lang="ja" aria-hidden className="jp text-base leading-none">
        あ
      </span>
      <span className="hidden sm:inline">Kana</span>
    </>
  );
}

/**
 * Brings up the kana chart of a page inside <KanaChartFrame />. Where the
 * chart stands beside the page, on a wide screen, it hides and shows it;
 * anywhere narrower it opens the chart in a sheet.
 */
export function KanaChartButton({ className }: { className?: string }) {
  const shown = useSettings((s) => s.kanaChart);
  const setShown = useSettings((s) => s.setKanaChart);
  const open = useKanaChart((s) => s.open);
  const setOpen = useKanaChart((s) => s.setOpen);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Kana chart"
        title="Kana chart"
        onMouseDown={keepFocus}
        onClick={() => setOpen(true)}
        className={cn(BUTTON, IDLE, "flex wide:hidden", className)}
      >
        <Face />
      </button>
      <button
        type="button"
        aria-pressed={shown}
        aria-label="Kana chart"
        title={shown ? "Hide the kana chart" : "Show the kana chart"}
        onMouseDown={keepFocus}
        onClick={() => setShown(!shown)}
        className={cn(BUTTON, shown ? ON : IDLE, "hidden wide:flex", className)}
      >
        <Face />
      </button>
    </>
  );
}
