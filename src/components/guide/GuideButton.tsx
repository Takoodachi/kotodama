"use client";

import { Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { GUIDE_BUTTON_ID, useGuide } from "@/store/guide";

const HINT_MS = 7000;

/**
 * The ⓘ Guide button in the header. The practice guide lives behind it after
 * the first visit; right after the guide first closes it pulses with a note.
 */
export function GuideButton({ className }: { className?: string }) {
  const hint = useGuide((s) => s.hint);
  const openGuide = useGuide((s) => s.openGuide);
  const dismissHint = useGuide((s) => s.dismissHint);

  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(dismissHint, HINT_MS);
    return () => clearTimeout(timer);
  }, [hint, dismissHint]);

  return (
    <div className={cn("relative", className)}>
      <button
        id={GUIDE_BUTTON_ID}
        type="button"
        onClick={openGuide}
        aria-label="Open the practice guide"
        title="How practice works"
        className={cn(
          "relative flex h-8 items-center gap-1.5 rounded-full border pr-3 pl-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors",
          hint
            ? "border-gold/70 text-gold-bright"
            : "border-white/15 text-mist hover:border-gold/60 hover:text-gold-bright",
        )}
      >
        {hint && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-gold"
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <Info className="size-5" strokeWidth={1.75} />
        Guide
      </button>

      <AnimatePresence>
        {hint && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 z-40 mt-3 w-56 rounded-xl border border-gold/40 bg-ink-800 px-3 py-2 text-xs leading-relaxed text-paper shadow-2xl"
          >
            <span className="absolute -top-1.5 right-6 size-3 rotate-45 border-t border-l border-gold/40 bg-ink-800" />
            Your guide lives here. Tap <span className="text-gold-bright">ⓘ Guide</span> anytime to see it again.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
