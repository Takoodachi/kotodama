"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BELOW_HEADER } from "@/components/layout/nav";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useHydrated } from "@/hooks/useHydrated";
import { useUnlockProgress } from "@/hooks/useUnlockProgress";
import { cn } from "@/lib/cn";
import { unlockedEntries } from "@/lib/dictionary";
import { useProgress } from "@/store/progress";
import { useLibraryRevision, useWordSets } from "@/store/wordSets";
import { DictionaryBrowser } from "./DictionaryBrowser";
import { DictionaryCredits } from "./DictionaryCredits";
import { JmdictResults } from "./JmdictResults";
import { SearchField } from "./SearchField";

type Source = "jmdict" | "library";

/**
 * The dictionary page. "Full dictionary" searches all of JMdict, fetched as
 * needed; "My library" lists the words, phrases and sentences the app
 * teaches, marked unlocked once answered right in a quiz: those are the ones
 * that can be consulted mid-quiz.
 */
export function DictionaryScreen() {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.records);
  const revision = useLibraryRevision();
  const meta = useWordSets((s) => s.meta);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the library itself grows when a word set arrives
  const unlocked = useMemo(() => unlockedEntries(records), [records, revision]);
  const progress = useUnlockProgress();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<Source>("jmdict");

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
      <header className="mt-2 mb-3">
        <p className="eyebrow">辞書 · Dictionary</p>
        <h1 className="mt-2 font-mincho text-3xl leading-tight text-paper md:text-5xl">Look up a word</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          A full Japanese–English dictionary, from English to Japanese or the other way round, and your own library of
          the words you&apos;ve unlocked.
        </p>
      </header>

      <div
        className={cn(
          "sticky z-20 -mx-4 border-b border-line bg-ink-950/80 px-4 py-3 backdrop-blur-xl md:-mx-8 md:px-8",
          BELOW_HEADER,
        )}
      >
        <SearchField value={query} onChange={setQuery} />
        <SegmentedControl
          label="Search in"
          value={source}
          onChange={setSource}
          className="mt-2.5"
          options={[
            { value: "jmdict", label: "Full dictionary" },
            {
              value: "library",
              label: (
                <>
                  My library
                  {hydrated && <span className="ml-1.5 text-gold-bright tabular-nums">{progress.unlocked.toLocaleString("en")}</span>}
                </>
              ),
              title: "My library",
            },
          ]}
        />
      </div>

      {source === "jmdict" ? (
        <JmdictResults query={query} onQuery={setQuery} onUseLibrary={() => setSource("library")} />
      ) : (
        <>
          <section className="glass mt-4 mb-4 rounded-2xl p-4 sm:p-5" aria-label="Unlocked entries">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm text-paper">
                Unlocked{" "}
                <span className="font-mincho text-2xl text-gold-bright tabular-nums">
                  {progress.unlocked.toLocaleString("en")}
                </span>
                <span className="text-mist tabular-nums"> / {progress.total.toLocaleString("en")}</span>
              </p>
              <p className="text-xs text-smoke tabular-nums">{Math.round((progress.unlocked / progress.total) * 100)}%</p>
            </div>
            <ProgressBar value={progress.unlocked / progress.total} className="mt-3" />
            <p className="mt-3 text-xs leading-relaxed text-mist">
              Get a word, phrase or sentence right in a quiz to unlock it. During a quiz the dictionary only shows what
              you&apos;ve unlocked, so every new entry is one you earned. JLPT word sets are listed here once you
              practice them.
            </p>
          </section>
          <DictionaryBrowser unlocked={unlocked} scope="all" query={query} />
        </>
      )}

      <DictionaryCredits date={meta?.date} className="mt-10 border-t border-line pt-4 text-xs text-smoke" />
    </motion.div>
  );
}
