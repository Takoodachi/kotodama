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

/**
 * How many grid columns a card takes so its word never wraps: one for up to
 * three characters, two for four or five, and three (a phone's whole row) beyond.
 */
export function cardColumns(text: string): 1 | 2 | 3 {
  const length = [...text].length;
  return length <= 3 ? 1 : length <= 5 ? 2 : 3;
}

/**
 * Orders cards row by row: each row takes cards in turn, and when the next
 * one won't fit the room left, a later card that does fills the gap. Laid
 * out in this order the grid has no holes and reads (and tabs) left to right,
 * row after row, instead of the browser back-filling gaps out of order.
 */
export function packRows<T>(items: readonly T[], width: (item: T) => number, columns: number): T[] {
  const queue = [...items];
  const packed: T[] = [];
  while (queue.length) {
    let room = columns;
    for (let i = 0; i < queue.length && room > 0; ) {
      const w = Math.min(width(queue[i]), columns);
      if (w <= room) {
        packed.push(...queue.splice(i, 1));
        room -= w;
      } else i++;
    }
  }
  return packed;
}

/** What to type, as a field placeholder; shorter on a one-column card. */
export function gridHint(item: StudyItem, wide = false): string {
  if (isKana(item)) return "romaji";
  return wide ? "reading or meaning" : "reading/meaning";
}
