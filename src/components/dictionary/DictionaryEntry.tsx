"use client";

import { BookOpenCheck, ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { ExampleSentence } from "@/components/japanese/ExampleSentence";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { GROUPS_BY_ID } from "@/data/groups";
import { romajiLabel, speechText } from "@/data/library";
import type { PartOfSpeech, StudyItem } from "@/data/types";
import { cn } from "@/lib/cn";
import type { FuriganaMode } from "@/store/settings";

const PART_OF_SPEECH: Record<PartOfSpeech, string> = {
  noun: "noun",
  pronoun: "pronoun",
  verb: "verb",
  "i-adj": "い-adjective",
  "na-adj": "な-adjective",
  adverb: "adverb",
  expression: "expression",
  counter: "counter",
};

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[10px] tracking-wide text-smoke">{children}</span>;
}

interface DictionaryEntryProps {
  item: StudyItem;
  unlocked: boolean;
  /** Shows whether the entry is unlocked; not needed where every entry listed is. */
  showLock: boolean;
  furigana: FuriganaMode;
}

/** One dictionary entry: how it's written and read, what it means, and (for words) an example to open. */
export function DictionaryEntry({ item, unlocked, showLock, furigana }: DictionaryEntryProps) {
  const [open, setOpen] = useState(false);
  const long = [...item.surface].length > 8;
  const kind = item.category === "vocab" ? item.pos && PART_OF_SPEECH[item.pos] : item.category;
  const set = GROUPS_BY_ID.get(item.groups[0])?.sublabel;
  const body = (
    <>
      <JpText
        text={item.jp}
        ruby={furigana === "hide" ? "none" : "show"}
        className={cn("block text-paper", long ? "text-lg leading-[2]" : "text-2xl leading-[1.9]")}
      />
      <span className="block text-xs text-mist">
        {item.reading !== item.surface && !long && (
          <>
            <JpText text={item.reading} ruby="none" /> ·{" "}
          </>
        )}
        {romajiLabel(item)}
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-paper">{item.meaning.join("; ")}</span>
      <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {kind && <Tag>{kind}</Tag>}
        {item.jlpt && <Tag>N{item.jlpt}</Tag>}
        {set && <Tag>{set}</Tag>}
      </span>
    </>
  );

  return (
    <li className="glass rounded-2xl">
      <div className="flex items-start gap-3 p-4">
        {item.example ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="group min-w-0 flex-1 text-left"
          >
            {body}
            <span className="mt-2.5 flex items-center gap-1 text-[11px] text-smoke transition-colors group-hover:text-mist">
              <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} />
              {open ? "Hide the example" : "Show an example"}
            </span>
          </button>
        ) : (
          <div className="min-w-0 flex-1">{body}</div>
        )}
        <div className="flex shrink-0 items-center gap-2.5">
          {showLock &&
            (unlocked ? (
              <span title="Unlocked: you can look this up during a quiz" className="text-gold-bright">
                <BookOpenCheck className="size-4" strokeWidth={1.75} aria-label="Unlocked" />
              </span>
            ) : (
              <span title="Locked: get it right in a quiz to unlock it" className="text-smoke/70">
                <Lock className="size-3.5" strokeWidth={1.75} aria-label="Locked" />
              </span>
            ))}
          <SpeakButton text={speechText(item)} size="sm" />
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4">
          <ExampleSentence item={item} furigana={furigana} />
        </div>
      )}
    </li>
  );
}
