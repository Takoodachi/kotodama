"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Category } from "@/data/types";
import type { Direction } from "@/lib/quiz/directions";

/** What reading mode asks for on each card. */
const CHOICES: { value: Direction; label: string; description: string }[] = [
  { value: "jp-romaji", label: "Reading", description: "Type how each card is read, in romaji." },
  { value: "jp-en", label: "Meaning", description: "Type what each card means, in English." },
  { value: "jp-both", label: "Both", description: "Type the reading and the meaning: a card is right when both are." },
];

/** Kinds of item that have a meaning to type. */
const WITH_MEANING: Category[] = ["kanji", "vocab", "phrase", "sentence"];

interface AnswerWithPickerProps {
  value: Direction;
  onChange: (direction: Direction) => void;
  /** Kinds of item selected. */
  categories: ReadonlySet<Category>;
}

/**
 * Reading mode's one question: answer each card with its reading, its meaning,
 * or both. Kana and grammar are always answered the same way, which the notes
 * below say when they're selected.
 */
export function AnswerWithPicker({ value, onChange, categories }: AnswerWithPickerProps) {
  const choosable = WITH_MEANING.some((c) => categories.has(c));
  const kana = categories.has("hiragana") || categories.has("katakana");
  const loose = value !== "jp-romaji" && (categories.has("phrase") || categories.has("sentence"));
  const chosen = CHOICES.find((c) => c.value === value) ?? CHOICES[2];

  return (
    <div>
      {choosable && (
        <>
          <SegmentedControl label="Answer with" value={chosen.value} onChange={onChange} options={CHOICES} />
          <p className="mt-2.5 text-xs leading-relaxed text-mist">{chosen.description}</p>
        </>
      )}
      <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-smoke">
        {loose && (
          <li>
            <span className="text-mist">Phrases and sentences</span> can be put in your own words: what counts is having
            their key words. If a right answer is marked wrong, tap &ldquo;I was right&rdquo;.
          </li>
        )}
        {kana && (
          <li>
            <span className="text-mist">Kana</span> are always answered with their reading, as they have no meaning to type.
          </li>
        )}
        {categories.has("grammar") && (
          <li>
            <span className="text-mist">Grammar</span> is always the missing word, typed in romaji.
          </li>
        )}
      </ul>
    </div>
  );
}
