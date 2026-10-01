"use client";

import { BookOpenCheck, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Category } from "@/data/types";
import { CATEGORY_LABELS } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { DICTIONARY, DICTIONARY_CATEGORIES, searchDictionary } from "@/lib/dictionary";
import { useSettings } from "@/store/settings";
import { DictionaryEntry } from "./DictionaryEntry";

/** Entries drawn at a time; more are added as the list is scrolled. */
const PAGE = 40;

interface DictionaryBrowserProps {
  /** Ids of the entries answered right at least once. */
  unlocked: ReadonlySet<string>;
  /**
   * "all": every entry, marked locked or unlocked, as on the dictionary page.
   * "unlocked": only the unlocked ones, as during a quiz.
   */
  scope: "all" | "unlocked";
  /** An entry to leave out: the card being asked. */
  hidden?: string;
  autoFocus?: boolean;
  /** Classes for the search bar and filters, e.g. to make them stick while the list scrolls. */
  controlsClassName?: string;
}

function Chip({
  on,
  onClick,
  children,
  count,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors",
        on ? "border-veil/25 bg-veil/[0.08] text-paper" : "border-line text-mist hover:border-veil/20 hover:text-paper",
      )}
    >
      {children}
      <span className="text-[10px] text-smoke tabular-nums">{count.toLocaleString("en")}</span>
    </button>
  );
}

/** The dictionary's search box, filters and results. */
export function DictionaryBrowser({ unlocked, scope, hidden, autoFocus, controlsClassName }: DictionaryBrowserProps) {
  const furigana = useSettings((s) => s.furigana);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Category | "all">("all");
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const unlockedOnly = scope === "unlocked" || onlyUnlocked;

  // Everything that can be listed here, before the search and the kind filter.
  const pool = useMemo(
    () => DICTIONARY.filter((item) => item.id !== hidden && (!unlockedOnly || unlocked.has(item.id))),
    [hidden, unlockedOnly, unlocked],
  );
  const counts = useMemo(() => {
    const byKind = new Map<Category, number>();
    for (const item of pool) byKind.set(item.category, (byKind.get(item.category) ?? 0) + 1);
    return byKind;
  }, [pool]);
  const results = useMemo(() => {
    const listed = new Set(pool.filter((item) => kind === "all" || item.category === kind).map((item) => item.id));
    return searchDictionary(deferredQuery, (item) => listed.has(item.id));
  }, [pool, kind, deferredQuery]);

  // How much of the list is drawn; a new search starts again from the first page.
  const listKey = `${deferredQuery}|${kind}|${unlockedOnly}`;
  const [drawn, setDrawn] = useState({ key: listKey, count: PAGE });
  const count = drawn.key === listKey ? drawn.count : PAGE;
  const more = count < results.length;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setDrawn({ key: listKey, count: count + PAGE });
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [more, listKey, count]);

  const unlockedCount = useMemo(() => DICTIONARY.filter((item) => unlocked.has(item.id)).length, [unlocked]);
  const empty = pool.length === 0;

  return (
    <div>
      <div className={controlsClassName}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-smoke" strokeWidth={1.75} />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus={autoFocus}
            placeholder="Search in English, Japanese or romaji"
            aria-label="Search the dictionary"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl border border-line bg-veil/[0.03] pr-11 pl-11 text-[15px] text-paper outline-none transition-colors placeholder:text-smoke focus:border-veil/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              aria-label="Clear the search"
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Chip on={kind === "all"} onClick={() => setKind("all")} count={pool.length}>
            All
          </Chip>
          {DICTIONARY_CATEGORIES.map((category) => (
            <Chip
              key={category}
              on={kind === category}
              onClick={() => setKind(kind === category ? "all" : category)}
              count={counts.get(category) ?? 0}
            >
              {CATEGORY_LABELS[category].en}
            </Chip>
          ))}
          {scope === "all" && (
            <button
              type="button"
              aria-pressed={onlyUnlocked}
              onClick={() => setOnlyUnlocked(!onlyUnlocked)}
              className={cn(
                "ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors",
                onlyUnlocked
                  ? "border-gold/50 bg-gold/[0.08] text-gold-bright"
                  : "border-line text-mist hover:border-gold/40 hover:text-gold-bright",
              )}
            >
              <BookOpenCheck className="size-3.5" strokeWidth={1.75} />
              Unlocked
              <span className="text-[10px] tabular-nums opacity-80">{unlockedCount.toLocaleString("en")}</span>
            </button>
          )}
        </div>
      </div>

      {empty ? (
        <p className="mt-8 px-2 text-center text-sm leading-relaxed text-mist">
          {unlocked.size === 0
            ? "Nothing here yet. Words, phrases and sentences appear once you get them right in a quiz."
            : "Nothing else unlocked yet. Each word, phrase or sentence you get right in a quiz is added here."}
        </p>
      ) : results.length === 0 ? (
        <p className="mt-8 px-2 text-center text-sm leading-relaxed text-mist">
          No matches for <span className="text-paper">&ldquo;{deferredQuery.trim()}&rdquo;</span>
          {unlockedOnly ? " among the entries you've unlocked." : "."}
        </p>
      ) : (
        <>
          <p className="mt-4 mb-2 px-1 text-[11px] tracking-wide text-smoke tabular-nums" aria-live="polite">
            {results.length.toLocaleString("en")} {results.length === 1 ? "entry" : "entries"}
            {deferredQuery.trim() ? ", best matches first" : ", in kana order"}
          </p>
          <ul className="space-y-2.5">
            {results.slice(0, count).map((item) => (
              <DictionaryEntry
                key={item.id}
                item={item}
                unlocked={unlocked.has(item.id)}
                showLock={scope === "all"}
                furigana={furigana}
              />
            ))}
          </ul>
          {more && <div ref={sentinel} className="h-10" aria-hidden />}
        </>
      )}
    </div>
  );
}
