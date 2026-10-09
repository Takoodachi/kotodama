"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Scrim } from "@/components/ui/Scrim";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { KanaScript } from "@/data/kanaChart";
import { cn } from "@/lib/cn";
import { useKanaChart } from "@/store/kanaChart";
import { KanaChart, SCRIPT_NAMES } from "./KanaChart";

const SCRIPTS: KanaScript[] = ["hiragana", "katakana"];

/**
 * The kana chart in a sheet, for screens without the room to keep it beside
 * the page. A phone shows one script at a time; anything wider, both.
 */
export function KanaChartSheet() {
  const open = useKanaChart((s) => s.open);
  const setOpen = useKanaChart((s) => s.setOpen);
  const [script, setScript] = useState<KanaScript>("hiragana");
  const closeButton = useRef<HTMLButtonElement>(null);

  // Left open when the page is left, it would open by itself on the next page with a chart.
  useEffect(() => () => setOpen(false), [setOpen]);

  // Esc closes; focus goes back to where it was (the field being typed in, usually).
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      before?.focus({ preventScroll: true });
    };
  }, [open, setOpen]);

  // Drawn on the body: inside the page it would sit under the app's header and tab bar, which are stacked above the page.
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="kana-chart" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <Scrim onClick={() => setOpen(false)} exitDuration={0.2} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kana-chart-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="pb-safe relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-ink-900/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-4 px-5 pt-4 sm:px-7 sm:pt-5">
              <h2 id="kana-chart-title" className="font-mincho text-2xl text-paper">
                Kana chart
              </h2>
              <button
                ref={closeButton}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close the kana chart"
                className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <SegmentedControl
              label="Script"
              value={script}
              onChange={setScript}
              className="mx-5 mt-3 sm:hidden"
              options={SCRIPTS.map((value) => ({ value, label: SCRIPT_NAMES[value].en }))}
            />
            <div className="mt-4 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:flex sm:gap-8 sm:px-7">
              {SCRIPTS.map((value) => (
                <KanaChart
                  key={value}
                  script={value}
                  roomy
                  className={cn("sm:flex-1", value !== script && "max-sm:hidden")}
                />
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
