import { kanjiReadings } from "@/data/library";
import type { StudyItem } from "@/data/types";
import {
  editDistance,
  japaneseKey,
  literalRomajiKey,
  normalizeEnglish,
  normalizeRomaji,
  readingKey,
} from "@/lib/japanese";
import { answerSide, type Direction } from "./directions";

/**
 * Reading answers. Kana are checked against their listed romaji exactly (so
 * "chi" is not accepted for ティ). Everything else is compared by reading key,
 * which accepts any common romanization, and against the listed romaji, which
 * covers particles written as pronounced (は → wa).
 */
export function checkReading(item: StudyItem, input: string): boolean {
  const literal = literalRomajiKey(input);
  if (!literal && !input.trim()) return false;

  if (item.category === "hiragana" || item.category === "katakana") {
    const answer = normalizeRomaji(input).replace(/\s+/g, "");
    return item.romaji.includes(answer);
  }

  if (literal && item.romaji.some((r) => literalRomajiKey(r) === literal)) return true;

  const key = readingKey(input);
  if (!key) return false;
  const readings = item.category === "kanji" ? kanjiReadings(item) : [item.reading];
  return [...readings, ...item.romaji].some((r) => readingKey(r) === key);
}

/** English answers, forgiving small typos in longer words. */
export function checkMeaning(item: StudyItem, input: string): boolean {
  const answer = normalizeEnglish(input);
  if (!answer) return false;
  return item.meaning.some((m) => {
    const expected = normalizeEnglish(m);
    if (expected === answer) return true;
    const allowed = expected.length >= 8 ? 2 : expected.length >= 4 ? 1 : 0;
    return editDistance(expected, answer) <= allowed;
  });
}

/**
 * Japanese answers typed with an IME. The written form or the kana reading are
 * both accepted, and katakana/hiragana are treated as equal, except for the
 * katakana set itself, where the script is the point.
 */
export function checkJapanese(item: StudyItem, input: string): boolean {
  const strict = item.category === "katakana";
  const answer = japaneseKey(input, strict);
  if (!answer) return false;
  const accepted = [item.surface, item.reading];
  if (item.category === "kanji") accepted.push(...kanjiReadings(item));
  return accepted.some((a) => japaneseKey(a, strict) === answer);
}

export function checkTypedAnswer(item: StudyItem, direction: Direction, input: string): boolean {
  switch (answerSide(direction)) {
    case "romaji":
      return checkReading(item, input);
    case "en":
      return checkMeaning(item, input);
    case "jp":
      return checkJapanese(item, input);
  }
}
