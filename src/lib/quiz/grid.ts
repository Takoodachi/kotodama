import { kanjiReadingLabel, romajiLabel } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { checkJapanese, checkMeaning, checkReading } from "./check";

const isKana = (item: StudyItem) => item.category === "hiragana" || item.category === "katakana";

/**
 * An answer typed on an all-at-once card. Kana want their romaji (typing the
 * kana itself would just copy the card). Kanji and words take any reading,
 * in romaji or kana, or the English meaning.
 */
export function checkGridAnswer(item: StudyItem, input: string): boolean {
  if (!input.trim()) return false;
  if (isKana(item)) return checkReading(item, input);
  return checkReading(item, input) || checkMeaning(item, input) || checkJapanese(item, input);
}

/** What a card says once answered or revealed: its reading, and the meaning for kanji and words. */
export function gridAnswer(item: StudyItem): { reading: string; meaning?: string } {
  if (isKana(item)) return { reading: romajiLabel(item) };
  if (item.category === "kanji") return { reading: kanjiReadingLabel(item).label, meaning: item.meaning[0] };
  return { reading: item.reading, meaning: item.meaning[0] };
}

/** What to type, as a field placeholder. */
export function gridHint(item: StudyItem): string {
  return isKana(item) ? "romaji" : "reading or meaning";
}
