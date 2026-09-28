import { toHiragana, toRomaji } from "wanakana";
import { cleanKanjiReading } from "@/lib/japanese";
import { toReading, toSurface } from "@/lib/furigana";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "./kana";
import kanjiJson from "./kanji.json";
import phrasesJson from "./phrases.json";
import sentencesJson from "./sentences.json";
import vocabJson from "./vocab.json";
import type { Category, RawItem, StudyItem } from "./types";

function resolve(raw: RawItem, category: Category): StudyItem {
  if (category === "kanji") {
    const readings = kanjiReadings(raw);
    return {
      ...raw,
      category,
      groups: [`kanji-n${raw.jlpt}`, `kanji-g${raw.grade}`],
      surface: raw.jp,
      reading: readings[0],
      romaji: raw.romaji ?? readings.map((r) => toRomaji(r)),
    };
  }
  const reading = raw.reading ?? toReading(raw.jp);
  return {
    ...raw,
    category,
    groups: [raw.group!],
    surface: toSurface(raw.jp),
    reading,
    romaji: raw.romaji ?? [toRomaji(reading)],
  };
}

/** All readings of a kanji as hiragana, kun'yomi first (they read as words on their own). */
export function kanjiReadings(item: Pick<RawItem, "on" | "kun">): string[] {
  const kun = (item.kun ?? []).map(cleanKanjiReading);
  const on = (item.on ?? []).map((r) => toHiragana(r));
  return [...new Set([...kun, ...on])];
}

/** Compact reading label for a kanji: on'yomi in katakana, then kun'yomi. */
export function kanjiReadingLabel(item: StudyItem): { label: string; sublabel: string } {
  const on = (item.on ?? []).slice(0, 2);
  const kun = (item.kun ?? []).slice(0, 2).map(cleanKanjiReading);
  const parts = [...on, ...kun];
  return {
    label: parts.join("、"),
    sublabel: parts.map((p) => toRomaji(p)).join(", "),
  };
}

export const LIBRARY: StudyItem[] = [
  ...HIRAGANA_ROWS.flatMap((row) => row.items).map((raw) => resolve(raw, "hiragana")),
  ...KATAKANA_ROWS.flatMap((row) => row.items).map((raw) => resolve(raw, "katakana")),
  ...(kanjiJson as RawItem[]).map((raw) => resolve(raw, "kanji")),
  ...(vocabJson as RawItem[]).map((raw) => resolve(raw, "vocab")),
  ...(phrasesJson as RawItem[]).map((raw) => resolve(raw, "phrase")),
  ...(sentencesJson as RawItem[]).map((raw) => resolve(raw, "sentence")),
];

export const ITEMS_BY_ID = new Map(LIBRARY.map((item) => [item.id, item]));

export const ITEMS_BY_GROUP: Map<string, StudyItem[]> = (() => {
  const map = new Map<string, StudyItem[]>();
  for (const item of LIBRARY) {
    for (const group of item.groups) {
      const list = map.get(group);
      if (list) list.push(item);
      else map.set(group, [item]);
    }
  }
  return map;
})();

export const ITEMS_BY_CATEGORY: Map<Category, StudyItem[]> = (() => {
  const map = new Map<Category, StudyItem[]>();
  for (const item of LIBRARY) {
    const list = map.get(item.category);
    if (list) list.push(item);
    else map.set(item.category, [item]);
  }
  return map;
})();

/**
 * Every item in any of the given groups, without duplicates. This is what
 * makes mix-and-match work: kana rows, kanji levels and phrase sets can be
 * combined freely.
 */
export function itemsForGroups(groupIds: Iterable<string>): StudyItem[] {
  const seen = new Set<string>();
  const items: StudyItem[] = [];
  for (const id of groupIds) {
    for (const item of ITEMS_BY_GROUP.get(id) ?? []) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }
  return items;
}

export function itemsByIds(ids: Iterable<string>): StudyItem[] {
  const items: StudyItem[] = [];
  for (const id of ids) {
    const item = ITEMS_BY_ID.get(id);
    if (item) items.push(item);
  }
  return items;
}

/** What speech synthesis should say for an item. */
export function speechText(item: StudyItem): string {
  if (item.speech) return item.speech;
  switch (item.category) {
    case "kanji":
    case "vocab":
      // The kana reading avoids the engine guessing the wrong reading of a lone kanji.
      return item.reading;
    default:
      // Whole phrases and sentences read best from the written form, so は and へ come out right.
      return item.surface;
  }
}
