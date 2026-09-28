"use client";

import { ArrowLeft, ArrowRight, Check, Ghost, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { GUIDE_BUTTON_ID, useGuide } from "@/store/guide";
import { useSettings } from "@/store/settings";

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 justify-center rounded border border-white/20 px-1.5 py-0.5 font-sans text-[11px] text-paper">
      {children}
    </kbd>
  );
}

function Chip({ jp, en, on }: { jp: string; en: string; on?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-14 w-16 flex-col items-center justify-center rounded-xl border",
        on
          ? "border-crimson/70 bg-crimson/[0.09] shadow-[0_0_24px_-8px_rgb(200_16_46/0.8)]"
          : "border-line bg-white/[0.02]",
      )}
    >
      {on && (
        <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-crimson">
          <Check className="size-2 text-paper" strokeWidth={3} />
        </span>
      )}
      <span lang="ja" className="jp text-xl leading-tight text-paper">{jp}</span>
      <span className="text-[10px] text-mist">{en}</span>
    </span>
  );
}

interface Step {
  glyph: string;
  title: string;
  visual: React.ReactNode;
  points: React.ReactNode[];
}

const STEPS: Step[] = [
  {
    glyph: "選",
    title: "Pick what to study",
    visual: (
      <div className="flex gap-2">
        <Chip jp="サ" en="sa" on />
        <Chip jp="N5" en="kanji" on />
        <Chip jp="挨拶" en="greetings" on />
        <Chip jp="カ" en="ka" />
      </div>
    ),
    points: [
      "Tap any set to add it: kana rows, kanji levels, word themes, phrases or sentences. Tap again to remove it.",
      "Mix anything. A katakana row, N5 kanji and greetings can share one session.",
      "Presets at the top add whole bundles, and several can be on at once.",
    ],
  },
  {
    glyph: "設",
    title: "Set up the quiz",
    visual: (
      <div className="flex gap-2">
        {[
          ["選", "Choice"],
          ["読", "Reading"],
          ["書", "Typing"],
        ].map(([jp, en], i) => (
          <span
            key={jp}
            className={cn(
              "flex h-14 w-20 flex-col items-center justify-center rounded-xl border",
              i === 0 ? "border-crimson/70 bg-crimson/[0.09]" : "border-line",
            )}
          >
            <span lang="ja" className="jp text-2xl leading-none text-paper">{jp}</span>
            <span className="mt-1 text-[10px] text-mist">{en}</span>
          </span>
        ))}
      </div>
    ),
    points: [
      <>
        <b className="font-medium text-paper">Mode:</b> pick from four options, type the reading or meaning, or
        type the Japanese.
      </>,
      <>
        <b className="font-medium text-paper">Directions:</b> what the card shows and what you answer with, like
        日本語 → English.
      </>,
      <>
        <b className="font-medium text-paper">Written in:</b> show words, phrases and sentences in hiragana,
        katakana, kanji or any mix. A preview shows the result.
      </>,
    ],
  },
  {
    glyph: "練",
    title: "Practice",
    visual: (
      <div className="flex items-center gap-2 text-xs text-mist">
        <Key>1</Key>–<Key>4</Key> answer <Key>Enter</Key> next <Key>Esc</Key> end
      </div>
    ),
    points: [
      "Press Begin. Anything you miss comes back a few cards later.",
      "New words show an example sentence. Tap it to hear it and see the translation.",
      "On a computer, use the number keys to answer and Enter or Space to move on.",
    ],
  },
  {
    glyph: "進",
    title: "Track and target",
    visual: (
      <div className="w-56 space-y-2">
        {[
          ["あ row", 0.8],
          ["N5 kanji", 0.35],
        ].map(([label, share]) => (
          <div key={label as string} className="flex items-center gap-2 text-[11px] text-mist">
            <span className="w-16">{label}</span>
            <span className="h-1.5 flex-1 rounded-full bg-gold/10">
              <span className="block h-full rounded-full bg-gold-bright" style={{ width: `${(share as number) * 100}%` }} />
            </span>
          </div>
        ))}
      </div>
    ),
    points: [
      "The gold line under each set fills as you master it.",
      <>
        <Ghost className="inline size-3.5 align-[-2px] text-paper" /> Ghost mode drills the 20 items you get wrong
        most.
      </>,
      "The Progress tab shows how much of each script, kanji level and theme you know.",
    ],
  },
];

/**
 * A short guide to the Practice tab. Opens by itself on the first visit, and
 * afterwards from the ⓘ Guide button, which it visibly shrinks into on close.
 */
export function PracticeGuide() {
  const router = useRouter();
  const hydrated = useHydrated();
  const guideSeen = useSettings((s) => s.guideSeen);
  const setGuideSeen = useSettings((s) => s.setGuideSeen);
  const manualOpen = useGuide((s) => s.open);
  const closeGuide = useGuide((s) => s.closeGuide);

  const firstVisit = hydrated && !guideSeen;
  const open = manualOpen || firstVisit;

  const [step, setStep] = useState(0);
  const [exitTo, setExitTo] = useState({ x: 0, y: 0 });
  const panel = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const last = step === STEPS.length - 1;

  const close = (goToPractice = false) => {
    // Fly the panel into the ⓘ button so it's clear where the guide went.
    const target = document.getElementById(GUIDE_BUTTON_ID)?.getBoundingClientRect();
    const box = panel.current?.getBoundingClientRect();
    if (target && box) {
      setExitTo({
        x: target.left + target.width / 2 - (box.left + box.width / 2),
        y: target.top + target.height / 2 - (box.top + box.height / 2),
      });
    }
    setStep(0);
    setGuideSeen(true);
    closeGuide(firstVisit);
    if (goToPractice) router.push("/practice");
  };

  useEffect(() => {
    if (!open) return;
    primary.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") setStep((s) => Math.min(s + 1, STEPS.length - 1));
      else if (event.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close() only changes identity with state it reads fresh each call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = STEPS[step];

  return (
    <AnimatePresence custom={exitTo}>
      {open && (
        <motion.div
          key="guide"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.1 } }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => close()} aria-hidden />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            custom={exitTo}
            variants={{
              hidden: { opacity: 0, y: 40, scale: 0.97 },
              shown: { opacity: 1, y: 0, x: 0, scale: 1 },
              gone: (to: { x: number; y: number }) => ({
                opacity: 0,
                x: to.x,
                y: to.y,
                scale: 0.06,
                transition: { duration: 0.6, ease: [0.7, 0, 0.3, 1] },
              }),
            }}
            initial="hidden"
            animate="shown"
            exit="gone"
            className="pb-safe relative w-full max-w-lg rounded-t-3xl border border-line bg-ink-900/95 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
          >
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow flex items-center gap-2">
                  <Info className="size-3.5 text-gold" /> Practice guide · {step + 1} / {STEPS.length}
                </p>
                <button
                  type="button"
                  onClick={() => close()}
                  aria-label="Close the guide"
                  className="-mt-1 -mr-1 flex size-9 items-center justify-center rounded-full text-mist transition-colors hover:bg-white/5 hover:text-paper"
                >
                  <X className="size-5" strokeWidth={1.5} />
                </button>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 id="guide-title" className="mt-3 flex items-center gap-3">
                    <span lang="ja" className="jp text-4xl text-gold-bright">{current.glyph}</span>
                    <span className="font-mincho text-2xl text-paper sm:text-3xl">{current.title}</span>
                  </h2>
                  <div className="mt-5 flex min-h-16 items-center justify-center rounded-2xl border border-line bg-white/[0.02] px-3 py-4">
                    {current.visual}
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {current.points.map((point, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-mist">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-crimson" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>

              <p className="mt-6 flex items-center gap-1.5 text-xs text-smoke">
                <Info className="size-3.5" /> Reopen this anytime with the <span className="text-paper">ⓘ Guide</span>{" "}
                button at the top of the screen.
              </p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex gap-1.5" aria-hidden>
                  {STEPS.map((s, i) => (
                    <span
                      key={s.glyph}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === step ? "w-5 bg-crimson" : "w-1.5 bg-white/20",
                      )}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="ghost" onClick={() => setStep(step - 1)} aria-label="Previous step">
                      <ArrowLeft className="size-4" />
                    </Button>
                  )}
                  <Button
                    ref={primary}
                    variant="primary"
                    onClick={() => (last ? close(true) : setStep(step + 1))}
                  >
                    {last ? "Start practicing" : "Next"} <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
