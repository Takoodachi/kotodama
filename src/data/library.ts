import { toHiragana, toRomaji } from "wanakana";
import { cleanKanjiReading } from "@/lib/japanese";
import { toReading, toSurface } from "@/lib/furigana";
import { ALL_SCRIPTS, isStandardWriting, writeAs, type Script } from "@/lib/writing";
import examplesJson from "./examples.json";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "./kana";
import kanjiJson from "./kanji.json";
import phrasesJson from "./phrases.json";
import sentencesJson from "./sentences.json";
import vocabJson from "./vocab.json";
import type { Category, Example, RawItem, StudyItem } from "./types";

/** Example sentences for words and kanji, keyed by item id. */
export const EXAMPLES: Record<string, Example> = examplesJson;

function resolve(raw: RawItem, category: Category): StudyItem {
  const example = EXAMPLES[raw.id];
  if (category === "kanji") {
    const readings = kanjiReadings(raw);
    return {
      ...raw,
      category,
      groups: [`kanji-n${raw.jlpt}`, `kanji-g${raw.grade}`],
      surface: raw.jp,
      reading: readings[0],
      romaji: raw.romaji ?? readings.map((r) => toRomaji(r)),
      example,
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
    example,
  };
}

/** Categories whose writing (hiragana / katakana / kanji) the learner can choose. */
const WRITTEN_CATEGORIES = new Set<Category>(["vocab", "phrase", "sentence"]);

/**
 * The part of an item to find (and highlight) inside its example sentence:
 * the word without its trailing kana, so conjugated forms still match
 * (食べる → 食, found in 食べましょう). Written in the chosen scripts.
 */
export function exampleTarget(item: StudyItem, scripts: readonly Script[] = ALL_SCRIPTS): string {
  const stem = item.jp.replace(/[ぁ-ゖ]+$/, "") || item.jp;
  return toSurface(WRITTEN_CATEGORIES.has(item.category) ? writeAs(stem, scripts) : stem);
}

/**
 * An item as it should be shown when words, phrases and sentences are
 * written only in the chosen scripts. Kana and kanji items are unchanged,
 * and speech keeps the normal writing so the voice reads it naturally.
 */
export function writtenItem(item: StudyItem, scripts: readonly Script[] = ALL_SCRIPTS): StudyItem {
  if (!WRITTEN_CATEGORIES.has(item.category) || isStandardWriting(scripts)) return item;
  const jp = writeAs(item.jp, scripts);
  return {
    ...item,
    jp,
    surface: toSurface(jp),
    speech: speechText(item),
    example: item.example && { ...item.example, jp: writeAs(item.example.jp, scripts) },
  };
}

/** All readings of a kanji as hiragana, kun'yomi first (they read as words on their own). */
export function kanjiReadings(item: Pick<RawItem, "on" | "kun">): string[] {
  const kun = (item.kun ?? []).map(cleanKanjiReading);
  const on = (item.on ?? []).map((r) => toHiragana(r));
  return [...new Set([...kun, ...on])];
}

const readingLabelCache = new Map<string, { label: string; sublabel: string }>();

/** Compact reading label for a kanji: on'yomi in katakana, then kun'yomi. Cached per kanji. */
export function kanjiReadingLabel(item: StudyItem): { label: string; sublabel: string } {
  const cached = readingLabelCache.get(item.id);
  if (cached) return cached;
  const on = (item.on ?? []).slice(0, 2);
  const kun = (item.kun ?? []).slice(0, 2).map(cleanKanjiReading);
  const parts = [...on, ...kun];
  const result = {
    label: parts.join("、"),
    sublabel: parts.map((p) => toRomaji(p)).join(", "),
  };
  readingLabelCache.set(item.id, result);
  return result;
}

export const LIBRARY: StudyItem[] = [
  ...HIRAGANA_ROWS.flatMap((row) => row.items).map((raw) => resolve(raw, "hiragana")),
  ...KATAKANA_ROWS.flatMap((row) => row.items).map((raw) => resolve(raw, "katakana")),
  ...(kanjiJson as RawItem[]).map((raw) => resolve(raw, "kanji")),
  ...(vocabJson as RawItem[]).map((raw) => resolve(raw, "vocab")),
  ...(phrasesJson as RawItem[]).map((raw) => resolve(raw, "phrase")),
  ...(sentencesJson as RawItem[]).map((raw) => resolve(raw, "sentence")),
];

/**
 * Kanji without a hand-written example borrow the shortest sentence in the
 * library that uses them: a word's example sentence or a grammar sentence.
 */
(function borrowKanjiExamples() {
  const pool: Example[] = [
    ...LIBRARY.filter((i) => i.category === "vocab" && i.example).map((i) => i.example!),
    ...LIBRARY.filter((i) => i.category === "sentence").map((i) => ({ jp: i.jp, en: i.meaning[0] })),
  ].sort((a, b) => toSurface(a.jp).length - toSurface(b.jp).length);
  for (const item of LIBRARY) {
    if (item.category !== "kanji" || item.example) continue;
    item.example = pool.find((ex) => toSurface(ex.jp).includes(item.surface));
  }
})();

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

/** The romaji shown for an item: its label ("ji (di)" for ぢ), else its first accepted spelling. */
export function romajiLabel(item: StudyItem): string {
  return item.romajiLabel ?? item.romaji[0];
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
