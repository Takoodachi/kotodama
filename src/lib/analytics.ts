import type { Category, StudyItem } from "@/data/types";
import { MASTERED_BOX, type SrsRecord } from "./srs";

/**
 * Where an item stands:
 * - new: never answered
 * - learning: answered, but not yet right twice in a row
 * - known: right at least twice in a row (box 2–3)
 * - mastered: box 4+, reviewed correctly over a week or more
 */
export type ItemState = "new" | "learning" | "known" | "mastered";

export const KNOWN_BOX = 2;

export function itemState(record: SrsRecord | undefined): ItemState {
  if (!record) return "new";
  if (record.box >= MASTERED_BOX) return "mastered";
  if (record.box >= KNOWN_BOX) return "known";
  return "learning";
}

export interface Breakdown {
  total: number;
  new: number;
  learning: number;
  known: number;
  mastered: number;
}

export function breakdown(items: readonly StudyItem[], records: Record<string, SrsRecord>): Breakdown {
  const counts: Breakdown = { total: items.length, new: 0, learning: 0, known: 0, mastered: 0 };
  for (const item of items) counts[itemState(records[item.id])]++;
  return counts;
}

/** Share of items known or mastered, 0–1. */
export function proficiency(counts: Breakdown): number {
  return counts.total ? (counts.known + counts.mastered) / counts.total : 0;
}

export function accuracy(record: SrsRecord): number {
  return record.seen ? record.correct / record.seen : 0;
}

/**
 * The items answered worst so far: lowest accuracy first, then most misses,
 * then lowest box. Only items that have been answered at least once count.
 */
export function weakestItems(records: Record<string, SrsRecord>, count: number, isKnownId: (id: string) => boolean): string[] {
  return Object.entries(records)
    .filter(([id, r]) => r.seen > 0 && isKnownId(id))
    .sort(
      ([, a], [, b]) =>
        accuracy(a) - accuracy(b) || b.lapses - a.lapses || a.box - b.box || b.last - a.last,
    )
    .slice(0, count)
    .map(([id]) => id);
}

export const CATEGORY_LABELS: Record<Category, { en: string; jp: string }> = {
  hiragana: { en: "Hiragana", jp: "ひらがな" },
  katakana: { en: "Katakana", jp: "カタカナ" },
  kanji: { en: "Kanji", jp: "漢字" },
  vocab: { en: "Words", jp: "単語" },
  phrase: { en: "Phrases", jp: "表現" },
  sentence: { en: "Sentences", jp: "文" },
  grammar: { en: "Grammar", jp: "文法" },
};

export const CATEGORIES: Category[] = ["hiragana", "katakana", "kanji", "vocab", "phrase", "sentence", "grammar"];
