"use client";

import { BookOpenCheck, ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { toRomaji } from "wanakana";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { cn } from "@/lib/cn";
import { kanjiIn } from "@/lib/jmdict/kanji";
import { headword, tagLabel } from "@/lib/jmdict/labels";
import type { JmEntry } from "@/lib/jmdict/types";
import type { FuriganaMode } from "@/store/settings";
import { KanjiCards } from "./KanjiDetails";

/** Senses shown before "Show all": the first few are the ones in everyday use. */
const SENSES_SHOWN = 3;

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] tracking-wide",
        gold ? "border-gold/40 text-gold-bright" : "border-line text-smoke",
      )}
    >
      {children}
    </span>
  );
}

interface JmdictEntryProps {
  entry: JmEntry;
  /** What the JMdict codes stand for (from the dictionary's summary). */
  tags: Record<string, string>;
  /**
   * Whether the word is one the app teaches, and if so whether it has been
   * answered right: "locked" or "unlocked". Left out for every other word.
   */
  practice?: "locked" | "unlocked";
  furigana: FuriganaMode;
}

/** One entry of the full dictionary: how the word is written and read, each of its senses, and its kanji to open. */
export function JmdictEntry({ entry, tags, practice, furigana }: JmdictEntryProps) {
  const [open, setOpen] = useState(false);
  const [kanjiOpen, setKanjiOpen] = useState(false);
  const word = headword(entry);
  // The kanji of its usual written form, even for a word shown in kana because it usually is.
  const kanji = kanjiIn(entry.k?.[0] ?? "");
  const long = [...word.written].length > 8;
  const senses = open ? entry.e : entry.e.slice(0, SENSES_SHOWN);
  const hidden = entry.e.length - SENSES_SHOWN;
  // A sense without its own part of speech has the one of the sense before it.
  const parts = entry.e.reduce<string[][]>((all, sense, i) => [...all, sense.p ?? all[i - 1] ?? []], []);

  return (
    <li className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <JpText
            text={word.markup}
            ruby={furigana === "hide" ? "none" : "show"}
            className={cn("block text-paper", long ? "text-lg leading-[2]" : "text-2xl leading-[1.9]")}
          />
          <p className="text-xs text-mist">
            {word.reading !== word.written && (
              <>
                <JpText text={word.reading} ruby="none" /> ·{" "}
              </>
            )}
            {toRomaji(word.reading)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {practice === "unlocked" && (
            <span title="Unlocked: you can look this up during a quiz" className="text-gold-bright">
              <BookOpenCheck className="size-4" strokeWidth={1.75} aria-label="Unlocked" />
            </span>
          )}
          {practice === "locked" && (
            <span title="In the practice sets. Get it right in a quiz to unlock it" className="text-smoke/70">
              <Lock className="size-3.5" strokeWidth={1.75} aria-label="Locked" />
            </span>
          )}
          <SpeakButton text={word.reading} size="sm" />
        </div>
      </div>

      <ol className="mt-2 space-y-1.5">
        {senses.map((sense, i) => {
          const changed = i === 0 || parts[i].join() !== parts[i - 1].join();
          const notes = [...(sense.m ?? []).map((code) => tagLabel(code, tags)), ...(sense.i ?? [])];
          return (
            <li key={i}>
              {changed && parts[i].length > 0 && (
                <p className={cn("text-[11px] text-smoke", i > 0 && "mt-2.5")}>
                  {parts[i].map((code) => tagLabel(code, tags)).join(", ")}
                </p>
              )}
              <p className="flex gap-2 text-sm leading-relaxed text-paper">
                {entry.e.length > 1 && <span className="w-4 shrink-0 text-right text-xs leading-[1.9] text-smoke tabular-nums">{i + 1}</span>}
                <span className="min-w-0">
                  {sense.g.join("; ")}
                  {notes.length > 0 && <span className="text-xs text-mist"> · {notes.join(" · ")}</span>}
                </span>
              </p>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-2 flex items-center gap-1 text-[11px] text-smoke transition-colors hover:text-mist"
        >
          <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
          {open ? "Show fewer" : `Show all ${entry.e.length} senses`}
        </button>
      )}

      {word.others.length > 0 && (
        <p className="mt-2.5 text-xs leading-relaxed text-mist">
          Also{" "}
          <span lang="ja" className="jp text-paper/80">
            {word.others.join("、")}
          </span>
        </p>
      )}
      {kanji.length > 0 && (
        <div className="mt-2.5">
          <button
            type="button"
            aria-expanded={kanjiOpen}
            onClick={() => setKanjiOpen(!kanjiOpen)}
            className="flex items-center gap-1.5 text-[11px] text-smoke transition-colors hover:text-mist"
          >
            <ChevronDown className={cn("size-3.5 transition-transform duration-300", kanjiOpen && "rotate-180")} />
            Kanji
            <span lang="ja" className="jp text-sm tracking-widest text-paper/80">
              {kanji.join("")}
            </span>
          </button>
          {/* Fetched when first opened. */}
          {kanjiOpen && <KanjiCards kanji={kanji} className="mt-2" />}
        </div>
      )}
      {(entry.c || entry.j) && (
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {entry.j && <Tag gold>JLPT N{entry.j}</Tag>}
          {entry.c && <Tag>common</Tag>}
        </p>
      )}
    </li>
  );
}
