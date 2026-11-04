"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Category } from "@/data/types";
import { useSpeech } from "@/hooks/useSpeech";
import type { Direction } from "@/lib/quiz/directions";

/** What reading mode asks for on each card. */
const CHOICES: { value: Direction; label: string; description: string }[] = [
  { value: "jp-romaji", label: "Reading", description: "Type how each card is read, in romaji." },
  { value: "jp-en", label: "Meaning", description: "Type what each card means, in English." },
  { value: "jp-both", label: "Both", description: "Type the reading and the meaning: a card is right when both are." },
  { value: "audio-romaji", label: "Listening", description: "Hear each card, then type what was said in romaji." },
];

/** What kana can be asked: they have no meaning to type. */
const KANA_CHOICES = new Set<Direction>(["jp-romaji", "audio-romaji"]);

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
  const { supported: canHear } = useSpeech();
  const meaningful = WITH_MEANING.some((c) => categories.has(c));
  const kana = categories.has("hiragana") || categories.has("katakana");
  const options = CHOICES.filter((c) => (canHear || c.value !== "audio-romaji") && (meaningful || KANA_CHOICES.has(c.value)));
  // Kana alone can still be heard instead of seen; with no sound either, there is nothing to choose.
  const choosable = options.length > 1;
  const loose = (value === "jp-en" || value === "jp-both") && (categories.has("phrase") || categories.has("sentence"));
  const chosen = options.find((c) => c.value === value) ?? (meaningful ? CHOICES[2] : CHOICES[0]);

  return (
    <div>
      {choosable && (
        <>
          <SegmentedControl label="Answer with" value={chosen.value} onChange={onChange} options={options} />
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
        {kana && meaningful && (value === "jp-en" || value === "jp-both") && (
          <li>
            <span className="text-mist">Kana</span> are always answered with their reading, as they have no meaning to type.
          </li>
        )}
        {value === "audio-romaji" && categories.has("kanji") && (
          <li>
            <span className="text-mist">Kanji</span> are asked by sight, as many share a reading.
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
