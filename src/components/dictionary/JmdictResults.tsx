"use client";

import { CloudOff, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { wordSetItemId } from "@/data/wordSets";
import { langOf } from "@/lib/japanese";
import { loadDictionaryFile, openDictionary } from "@/lib/jmdict/client";
import { kanjiIn } from "@/lib/jmdict/kanji";
import type { Hit } from "@/lib/jmdict/search";
import type { JmEntry } from "@/lib/jmdict/types";
import { isUnlocked } from "@/lib/srs";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";
import { useFetchedSets } from "@/store/fetchedSets";
import { JmdictEntry } from "./JmdictEntry";
import { KanjiCards } from "./KanjiDetails";

/** Entries fetched at a time; more follow as the list is scrolled. */
const PAGE = 12;
/** How long typing has to pause before a search goes out. */
const TYPING_PAUSE = 200;
const EXAMPLES = ["eat", "食べる", "taberu", "ねこ", "good morning"];
/** A short search in kanji is as likely about the characters as about a word: their details lead the results. */
const KANJI_QUERY = { characters: 4, kanji: 3 };

interface Found {
  query: string;
  hits: Hit[];
  /** The entries of the first hits, as far as they have been fetched. */
  entries: JmEntry[];
}

interface JmdictResultsProps {
  query: string;
  onQuery: (query: string) => void;
  /** Switches to the learner's own library, which needs no connection. */
  onUseLibrary: () => void;
}

/** Search results from the full dictionary (JMdict), fetched as the query is typed. */
export function JmdictResults({ query, onQuery, onUseLibrary }: JmdictResultsProps) {
  const furigana = useSettings((s) => s.furigana);
  const records = useProgress((s) => s.records);
  const meta = useFetchedSets((s) => s.meta);
  const loadMeta = useFetchedSets((s) => s.loadMeta);
  const typed = query.trim();
  const [found, setFound] = useState<Found | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The app's own words and phrases by dictionary entry, to mark the ones that can be unlocked.
  const [taught, setTaught] = useState<Map<number, string[]> | null>(null);

  useEffect(loadMeta, [loadMeta, attempt]);

  useEffect(() => {
    let stale = false;
    loadDictionaryFile("links.json").then(
      (links) => {
        if (stale) return;
        const byEntry = new Map<number, string[]>();
        for (const [id, entry] of Object.entries(links as Record<string, number>)) {
          byEntry.set(entry, [...(byEntry.get(entry) ?? []), id]);
        }
        setTaught(byEntry);
      },
      () => {},
    );
    return () => {
      stale = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!typed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      try {
        const dictionary = await openDictionary();
        const hits = await dictionary.search(typed);
        const entries = await dictionary.entries(hits.slice(0, PAGE).map((hit) => hit.at));
        if (stale) return;
        setFound({ query: typed, hits, entries });
        setFailed(null);
      } catch {
        if (!stale) setFailed(typed);
      }
    }, TYPING_PAUSE);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [typed, attempt]);

  const current = found?.query === typed ? found : null;
  const more = !!current && current.entries.length < current.hits.length;
  const fetching = useRef(false);
  const showMore = useCallback(async () => {
    if (!current || fetching.current) return;
    fetching.current = true;
    try {
      const dictionary = await openDictionary();
      const from = current.entries.length;
      const next = await dictionary.entries(current.hits.slice(from, from + PAGE).map((hit) => hit.at));
      setFound((now) => (now === current ? { ...current, entries: [...current.entries, ...next] } : now));
    } catch {
      // Offline for the moment: the button stays, to try again.
    } finally {
      fetching.current = false;
    }
  }, [current]);

  const moreButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = moreButton.current;
    if (!el || !more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void showMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [more, showMore]);

  const practice = (entry: JmEntry) => {
    const ids = [...(taught?.get(entry.s) ?? []), ...(entry.j ? [wordSetItemId(entry.j, entry.s)] : [])];
    if (!ids.length) return undefined;
    return ids.some((id) => isUnlocked(records[id])) ? "unlocked" : "locked";
  };

  if (!typed) {
    return (
      <div className="mt-8 px-2 text-center">
        <p className="text-sm leading-relaxed text-mist">
          Type a word in English, Japanese or romaji to search{" "}
          <span className="text-paper tabular-nums">{meta ? meta.entries.toLocaleString("en") : "over 200,000"}</span>{" "}
          entries.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onQuery(example)}
              lang={langOf(example)}
              className="jp h-8 rounded-full border border-line px-3.5 text-xs text-mist transition-colors hover:border-veil/20 hover:text-paper"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (failed === typed) {
    return (
      <div className="mt-8 px-2 text-center" role="alert">
        <CloudOff className="mx-auto size-6 text-smoke" strokeWidth={1.5} />
        <p className="mt-3 text-sm leading-relaxed text-mist">
          The full dictionary couldn&apos;t be reached. It needs a connection for words you haven&apos;t looked up
          before.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setAttempt(attempt + 1)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-xs text-paper transition-colors hover:border-veil/25"
          >
            <RotateCw className="size-3.5" /> Try again
          </button>
          <button
            type="button"
            onClick={onUseLibrary}
            className="h-9 rounded-full border border-gold/40 px-4 text-xs text-gold-bright transition-colors hover:border-gold/60"
          >
            Search my library instead
          </button>
        </div>
      </div>
    );
  }

  const queryKanji = [...typed].length <= KANJI_QUERY.characters ? kanjiIn(typed).slice(0, KANJI_QUERY.kanji) : [];
  const kanji = queryKanji.length > 0 && (
    <section aria-label="Kanji" className="mt-4">
      <h2 className="mb-2 px-1 text-[11px] tracking-wide text-smoke">Kanji</h2>
      <KanjiCards kanji={queryKanji} />
    </section>
  );

  // While the first search is out there is nothing to show yet; later ones keep the last results, dimmed.
  const shown = current ?? found;
  if (!shown) {
    return (
      <>
        {kanji}
        <p className="mt-8 px-2 text-center text-sm text-mist" role="status">
          Searching…
        </p>
      </>
    );
  }

  if (shown.hits.length === 0 && current) {
    return (
      <>
        {kanji}
        <p className="mt-8 px-2 text-center text-sm leading-relaxed text-mist">
          No {kanji ? "words" : "matches"} for <span className="text-paper">&ldquo;{typed}&rdquo;</span>. Verbs and
          adjectives are listed in their dictionary form (<span lang="ja" className="jp">食べる</span>, not{" "}
          <span lang="ja" className="jp">食べます</span>).
        </p>
      </>
    );
  }

  return (
    <div className={current ? undefined : "opacity-50 transition-opacity"} aria-busy={!current}>
      {kanji}
      <p className="mt-4 mb-2 px-1 text-[11px] tracking-wide text-smoke tabular-nums" aria-live="polite">
        {current
          ? `${shown.hits.length.toLocaleString("en")} ${shown.hits.length === 1 ? "entry" : "entries"}, best matches first`
          : "Searching…"}
      </p>
      <ul className="space-y-2.5">
        {shown.entries.map((entry) => (
          <JmdictEntry key={entry.s} entry={entry} tags={meta?.tags ?? {}} practice={practice(entry)} furigana={furigana} />
        ))}
      </ul>
      {more && (
        <button
          ref={moreButton}
          type="button"
          onClick={() => void showMore()}
          className="mt-3 h-10 w-full rounded-2xl border border-line text-xs text-mist transition-colors hover:border-veil/20 hover:text-paper"
        >
          Show more
        </button>
      )}
    </div>
  );
}
