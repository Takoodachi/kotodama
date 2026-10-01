import { isKana, toHiragana, toRomaji } from "wanakana";
import { ITEMS_BY_CATEGORY, kanjiReadings, libraryRevision } from "@/data/library";
import type { PartOfSpeech, StudyItem } from "@/data/types";
import {
  contentWords,
  editDistance,
  japaneseKey,
  literalRomajiKey,
  normalizeEnglish,
  normalizeRomaji,
  readingKey,
} from "@/lib/japanese";
import { answerSide, isCloze, type Direction, type Side } from "./directions";

/**
 * Reading answers. Kana are checked against their listed romaji exactly (so
 * "chi" is not accepted for ティ). A Japanese keyboard left on turns typed
 * romaji into kana ("ka" → か), so kana typed in are read back as romaji.
 * Everything else is compared by reading key,
 * which accepts any common romanization, and against the listed romaji, which
 * covers particles written as pronounced (は → wa).
 */
export function checkReading(item: StudyItem, input: string): boolean {
  const literal = literalRomajiKey(input);
  if (!literal && !input.trim()) return false;

  if (item.category === "hiragana" || item.category === "katakana") {
    const typed = normalizeRomaji(input).replace(/\s+/g, "");
    return item.romaji.includes(isKana(typed) ? toRomaji(typed) : typed);
  }

  if (literal && item.romaji.some((r) => literalRomajiKey(r) === literal)) return true;

  const key = readingKey(input);
  if (!key) return false;
  const readings = item.category === "kanji" ? kanjiReadings(item) : [item.reading];
  return [...readings, ...item.romaji].some((r) => readingKey(r) === key);
}

/**
 * English answers, forgiving small typos in longer words. Phrases and
 * sentences can be put many ways, so for them it's enough to have the words
 * that carry the meaning, in any order (see `sameWords`).
 */
export function checkMeaning(item: StudyItem, input: string): boolean {
  const answer = normalizeEnglish(input);
  if (!answer) return false;
  const loose = item.category === "phrase" || item.category === "sentence";
  return item.meaning.some((m) => {
    const expected = normalizeEnglish(m);
    if (expected === answer) return true;
    const allowed = expected.length >= 8 ? 2 : expected.length >= 4 ? 1 : 0;
    if (editDistance(expected, answer) <= allowed) return true;
    return loose && sameWords(m, input);
  });
}

/** Two words that are the same, give or take a typo in a longer one. */
function sameWord(a: string, b: string): boolean {
  return a === b || (Math.max(a.length, b.length) >= 5 && editDistance(a, b) <= 1);
}

/**
 * Whether an answer has every meaningful word of the expected translation,
 * in any order, with at most one extra (two in longer sentences).
 * "My father isn't a doctor" matches "My father is not a doctor."; "I drink
 * tea" doesn't match "I drink coffee".
 */
export function sameWords(expected: string, answer: string): boolean {
  const want = contentWords(expected);
  const left = contentWords(answer);
  if (!want.length || !left.length) return false;
  for (const word of want) {
    const at = left.findIndex((w) => sameWord(w, word));
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return left.length <= (want.length >= 5 ? 2 : 1);
}

/** A card answered with both its reading and its meaning: each half checked on its own. */
export function checkBoth(item: StudyItem, reading: string, meaning: string): { reading: boolean; meaning: boolean } {
  return {
    reading: !!reading.trim() && checkReading(item, reading),
    meaning: !!meaning.trim() && checkMeaning(item, meaning),
  };
}

/**
 * Japanese answers typed with an IME. The written form or the kana reading are
 * both accepted, and katakana/hiragana are treated as equal, except for the
 * katakana set itself, where the script is the point. A kana asked as plain
 * "ji" or "zu" also takes its twin (ぢ, づ), which sounds the same.
 */
export function checkJapanese(item: StudyItem, input: string): boolean {
  const strict = item.category === "katakana";
  const answer = japaneseKey(input, strict);
  if (!answer) return false;
  const accepted = [item.surface, item.reading];
  if (item.sameSound) accepted.push(item.sameSound);
  if (item.category === "kanji") accepted.push(...kanjiReadings(item));
  return accepted.some((a) => japaneseKey(a, strict) === answer);
}

/** は, へ and を as particles are said wa, e and o; either spelling counts. */
const foldParticles = (kana: string) => kana.replace(/は/g, "わ").replace(/へ/g, "え").replace(/を/g, "お");

/**
 * The missing word in a grammar sentence. In Japanese it must be spelled
 * right (は, not わ); in romaji, particles can be typed as said or as spelled.
 */
export function checkGap(item: StudyItem, input: string, side: Side): boolean {
  const accepted = [item.answer!, ...(item.alsoRight ?? [])];
  if (side === "romaji") {
    const key = readingKey(foldParticles(toHiragana(normalizeRomaji(input), { passRomaji: false })));
    return !!key && accepted.some((a) => readingKey(foldParticles(toHiragana(a))) === key);
  }
  const answer = japaneseKey(input);
  return !!answer && accepted.some((a) => japaneseKey(a) === answer);
}

/** Nouns, verbs and adjectives of either kind are each one class of word; the rest are another. */
const WORD_CLASS: Record<PartOfSpeech, string> = {
  noun: "noun",
  pronoun: "noun",
  verb: "verb",
  "i-adj": "adjective",
  "na-adj": "adjective",
  adverb: "other",
  expression: "other",
  counter: "other",
};

const synonymKey = (item: StudyItem) =>
  `${item.category}|${item.pos ? WORD_CLASS[item.pos] : ""}|${normalizeEnglish(item.meaning[0] ?? "")}`;

let synonyms: { revision: number; index: Map<string, StudyItem[]> } | null = null;

/**
 * Other words (or phrases) with the same first meaning and the same class of
 * word: 朝食 for 朝ご飯, 今夜 for 今晩. When a card shows only the English,
 * any of them is a right answer.
 */
export function synonymsOf(item: StudyItem): StudyItem[] {
  if (item.category !== "vocab" && item.category !== "phrase") return [];
  // Built again when the library grows (a dictionary word set arriving).
  if (synonyms?.revision !== libraryRevision()) {
    const index = new Map<string, StudyItem[]>();
    for (const category of ["vocab", "phrase"] as const) {
      for (const other of ITEMS_BY_CATEGORY.get(category) ?? []) {
        const key = synonymKey(other);
        const same = index.get(key);
        if (same) same.push(other);
        else index.set(key, [other]);
      }
    }
    synonyms = { revision: libraryRevision(), index };
  }
  return (synonyms.index.get(synonymKey(item)) ?? []).filter((other) => other.id !== item.id);
}

export function checkTypedAnswer(item: StudyItem, direction: Direction, input: string): boolean {
  if (isCloze(direction)) return checkGap(item, input, answerSide(direction));
  switch (answerSide(direction)) {
    case "romaji":
      return checkReading(item, input);
    case "en":
      return checkMeaning(item, input);
    case "jp":
      return (
        checkJapanese(item, input) ||
        // From English alone, a synonym is just as right.
        (direction === "en-jp" && synonymsOf(item).some((synonym) => checkJapanese(synonym, input)))
      );
  }
}
