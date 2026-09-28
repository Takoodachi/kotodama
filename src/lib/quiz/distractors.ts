import { ITEMS_BY_CATEGORY, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { normalizeEnglish } from "@/lib/japanese";
import { shuffle, weightedSample, type Rng } from "@/lib/random";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";
import { areConfusable } from "./confusables";
import { answerLabel, answerSide, promptSide, type Direction, type Side } from "./directions";

export interface ChoiceOption {
  itemId: string;
  label: string;
  sublabel?: string;
  correct: boolean;
}

const labelKey = (label: string) => label.normalize("NFKC").toLowerCase().replace(/[\s.,!?。、！？]/g, "");

/** True when two items share any English meaning ("excuse me" ≈ "excuse me (entering)"). */
function sharesMeaning(a: StudyItem, b: StudyItem): boolean {
  const meanings = new Set(a.meaning.map(normalizeEnglish));
  return b.meaning.some((m) => meanings.has(normalizeEnglish(m)));
}

function fitsPrompt(item: StudyItem, candidate: StudyItem, prompt: Side): boolean {
  switch (prompt) {
    case "jp":
      return candidate.surface === item.surface;
    case "romaji": {
      const readings = new Set(item.romaji.map(labelKey));
      return candidate.romaji.some((r) => readings.has(labelKey(r)));
    }
    case "en":
      return sharesMeaning(item, candidate);
  }
}

const lastLetter = (romaji: string) => romaji.slice(-1);
const firstLetter = (romaji: string) => romaji[0];

/**
 * How believable `candidate` is as a wrong answer for `item`. Look-alike
 * characters score highest, then items from the same set, the same part of
 * speech or JLPT level, and answers of similar length.
 */
function plausibility(item: StudyItem, candidate: StudyItem, poolIds: Set<string>, direction: Direction): number {
  let score = 1;
  if (poolIds.has(candidate.id)) score += 1;
  if (candidate.groups.some((g) => item.groups.includes(g))) score += 3;
  if (areConfusable(item.surface, candidate.surface)) score += 8;
  // A lone character among combinations (シ next to キャ) gives the answer away.
  if ([...candidate.surface].length === [...item.surface].length) score += 3;

  switch (item.category) {
    case "hiragana":
    case "katakana": {
      const [a, b] = [item.romaji[0], candidate.romaji[0]];
      if (lastLetter(a) === lastLetter(b)) score += 1;
      if (firstLetter(a) === firstLetter(b)) score += 1;
      break;
    }
    case "kanji":
      if (candidate.jlpt === item.jlpt) score += 2;
      break;
    case "vocab":
      if (candidate.pos === item.pos) score += 4;
      break;
  }

  const side = answerSide(direction);
  const a = answerLabel(item, side).label;
  const b = answerLabel(candidate, side).label;
  if (Math.abs(a.length - b.length) <= Math.max(2, a.length * 0.25)) score += 1;
  return score;
}

/**
 * Builds the options for a multiple-choice question: the correct answer plus
 * up to `count - 1` distractors from the same category. Candidates come from
 * the whole library category, so there are enough of them even when the
 * learner picked a single five-character row. Options whose text matches the
 * correct answer (じ and ぢ are both "ji") are never offered.
 */
export function buildOptions(
  source: StudyItem,
  direction: Direction,
  pool: readonly StudyItem[],
  rng: Rng,
  { count = 4, writing = ALL_SCRIPTS }: { count?: number; writing?: readonly Script[] } = {},
): ChoiceOption[] {
  // Japanese options are shown in the learner's chosen writing.
  const show = (it: StudyItem) => writtenItem(it, writing);
  const item = show(source);
  const side = answerSide(direction);
  const correct = { itemId: item.id, ...answerLabel(item, side), correct: true };
  const taken = new Set([labelKey(correct.label)]);
  const poolIds = new Set(pool.map((p) => p.id));

  const prompt = promptSide(direction);
  const candidates = (ITEMS_BY_CATEGORY.get(item.category) ?? []).map(show).filter(
    (c) =>
      c.id !== item.id &&
      (side !== "en" || c.meaning.length > 0) &&
      // A distractor that also fits the prompt would be a second right answer,
      // and so would a synonym offered as an English answer.
      !fitsPrompt(item, c, prompt) &&
      !(side === "en" && sharesMeaning(item, c)),
  );
  // Over-sample, then drop answers that collide with one already chosen.
  const ranked = weightedSample(
    candidates,
    (c) => plausibility(item, c, poolIds, direction) ** 3,
    candidates.length,
    rng,
  );

  const distractors: ChoiceOption[] = [];
  for (const candidate of ranked) {
    if (distractors.length >= count - 1) break;
    const option = { itemId: candidate.id, ...answerLabel(candidate, side), correct: false };
    const key = labelKey(option.label);
    if (taken.has(key)) continue;
    taken.add(key);
    distractors.push(option);
  }

  return shuffle([correct, ...distractors], rng);
}
