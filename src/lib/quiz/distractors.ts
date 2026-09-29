import { ITEMS_BY_CATEGORY, romajiLabel, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { normalizeEnglish } from "@/lib/japanese";
import { shuffle, weightedSample, type Rng } from "@/lib/random";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";
import { areConfusable } from "./confusables";
import { answerLabel, answerSide, isCloze, primaryMeaning, promptSide, type Direction, type Side } from "./directions";

export interface ChoiceOption {
  itemId: string;
  label: string;
  sublabel?: string;
  correct: boolean;
  /** English meaning, shown once answered, for options written in Japanese or romaji. */
  meaning?: string;
}

const labelKey = (label: string) => label.normalize("NFKC").toLowerCase().replace(/[\s.,!?。、！？]/g, "");

// Normalized English meanings per item id, computed once: every question
// compares the answer against hundreds of candidates.
const meaningCache = new Map<string, Set<string>>();
function meaningsOf(item: StudyItem): Set<string> {
  let set = meaningCache.get(item.id);
  if (!set) {
    set = new Set(item.meaning.map(normalizeEnglish));
    meaningCache.set(item.id, set);
  }
  return set;
}

/** True when two items share any English meaning ("excuse me" ≈ "excuse me (entering)"). */
function sharesMeaning(a: StudyItem, b: StudyItem): boolean {
  const meanings = meaningsOf(a);
  for (const m of meaningsOf(b)) if (meanings.has(m)) return true;
  return false;
}

function fitsPrompt(item: StudyItem, candidate: StudyItem, prompt: Side): boolean {
  switch (prompt) {
    case "jp":
      return candidate.surface === item.surface;
    case "romaji": {
      // The card shows one spelling: "ji" fits both じ and ぢ, "ji (di)" only ぢ.
      const shown = labelKey(romajiLabel(item));
      return candidate.romaji.some((r) => labelKey(r) === shown);
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

/** A grammar gap: the right filler and hand-picked wrong ones, which don't fit the sentence. */
function gapOptions(item: StudyItem, rng: Rng, count: number): ChoiceOption[] {
  const wrong = shuffle([...new Set(item.wrong ?? [])], rng).slice(0, count - 1);
  return shuffle(
    [item.answer!, ...wrong].map((label, i) => ({ itemId: item.id, label, correct: i === 0 })),
    rng,
  );
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
  if (isCloze(direction)) return gapOptions(item, rng, count);
  const side = answerSide(direction);
  // Meanings teach what the other options say too. A kanji's reading options
  // belong to other kanji, so theirs would only confuse.
  const withMeaning = side !== "en" && !(side === "romaji" && item.category === "kanji");
  const toOption = (it: StudyItem, correct: boolean): ChoiceOption => ({
    itemId: it.id,
    ...answerLabel(it, side),
    correct,
    ...(withMeaning && it.meaning.length ? { meaning: primaryMeaning(it) } : {}),
  });
  const correct = toOption(item, true);
  // Spellings the answer accepts: an option showing one of them would be right too ("ji" for ぢ).
  const accepted = new Set(item.romaji.map(labelKey));
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
      !(side === "en" && sharesMeaning(item, c)) &&
      !(side === "romaji" && accepted.has(labelKey(answerLabel(c, side).label))),
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
    const option = toOption(candidate, false);
    const key = labelKey(option.label);
    if (taken.has(key)) continue;
    taken.add(key);
    distractors.push(option);
  }

  return shuffle([correct, ...distractors], rng);
}
