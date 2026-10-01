"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo } from "react";
import { BELOW_HEADER } from "@/components/layout/nav";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { DICTIONARY, unlockedEntries } from "@/lib/dictionary";
import { useProgress } from "@/store/progress";
import { DictionaryBrowser } from "./DictionaryBrowser";

/**
 * The whole dictionary: every word, phrase and sentence in the library, to
 * look up in English, Japanese or romaji. Entries answered right in a quiz
 * are marked unlocked: those are the ones that can be consulted mid-quiz.
 */
export function DictionaryScreen() {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.records);
  const unlocked = useMemo(() => unlockedEntries(records), [records]);
  const total = DICTIONARY.length;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: hydrated ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 md:px-8 md:pt-8"
    >
      <Link
        href="/practice"
        className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-xs text-mist transition-colors hover:bg-veil/5 hover:text-paper"
      >
        <ArrowLeft className="size-4" /> Practice
      </Link>
      <header className="mt-2 mb-5">
        <p className="eyebrow">辞書 · Dictionary</p>
        <h1 className="mt-2 font-mincho text-3xl leading-tight text-paper md:text-5xl">Look up a word</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Every word, phrase and sentence in Kotodama, from English to Japanese or the other way round.
        </p>
      </header>

      <section className="glass mb-5 rounded-2xl p-4 sm:p-5" aria-label="Unlocked entries">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-paper">
            Unlocked{" "}
            <span className="font-mincho text-2xl text-gold-bright tabular-nums">{unlocked.size.toLocaleString("en")}</span>
            <span className="text-mist tabular-nums"> / {total.toLocaleString("en")}</span>
          </p>
          <p className="text-xs text-smoke tabular-nums">{Math.round((unlocked.size / total) * 100)}%</p>
        </div>
        <ProgressBar value={unlocked.size / total} className="mt-3" />
        <p className="mt-3 text-xs leading-relaxed text-mist">
          Get a word, phrase or sentence right in a quiz to unlock it. During a quiz the dictionary only shows what
          you&apos;ve unlocked, so every new entry is one you earned.
        </p>
      </section>

      <DictionaryBrowser
        unlocked={unlocked}
        scope="all"
        controlsClassName={cn(
          "sticky z-20 -mx-4 border-b border-line bg-ink-950/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8",
          BELOW_HEADER,
        )}
      />
    </motion.div>
  );
}
