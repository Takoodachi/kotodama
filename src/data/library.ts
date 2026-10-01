import { toHiragana, toRomaji } from "wanakana";
import { cleanKanjiReading } from "@/lib/japanese";
import { toReading, toSurface } from "@/lib/furigana";
import { ALL_SCRIPTS, isStandardWriting, writeAs, writeSurfaceAs, type Script } from "@/lib/writing";
import examplesJson from "./examples.json";
import grammarJson from "./grammar.json";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "./kana";
import kanjiJson from "./kanji.json";
import phrasesJson from "./phrases.json";
import sentencesJson from "./sentences.json";
import vocabJson from "./vocab.json";
import type { KanjiSetFile, SetFile } from "@/lib/jmdict/types";
import { setKeyOf, type SetKey } from "./fetchedSets";
import { kanjiSetOf } from "./kanjiSets";
import type { Category, Example, RawItem, StudyItem } from "./types";
import { wordSetGroupId, wordSetItemId } from "./wordSets";

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
  // Grammar: `jp` arrives with ＿ for the gap; the item keeps the whole sentence.
  const jp = category === "grammar" ? raw.jp.replace(GAP, raw.answer!) : raw.jp;
  const reading = raw.reading ?? toReading(jp);
  return {
    ...raw,
    category,
    groups: [raw.group!],
    jp,
    surface: toSurface(jp),
    reading,
    romaji: raw.romaji ?? [toRomaji(reading)],
    example,
    ...(category === "grammar" && { cloze: raw.jp }),
  };
}

/** Marks the missing word in a grammar sentence. */
export const GAP = "＿";

/** Categories whose writing (hiragana / katakana / kanji) the learner can choose. */
export const WRITTEN_CATEGORIES = new Set<Category>(["vocab", "phrase", "sentence", "grammar"]);

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
  const surface = toSurface(jp);
  return {
    ...item,
    jp,
    surface,
    speech: speechText(item),
    ...(surface !== item.surface && { usual: item.jp }),
    example: item.example && { ...item.example, jp: writeAs(item.example.jp, scripts) },
    ...(item.cloze && {
      cloze: writeAs(item.cloze, scripts),
      answer: writeSurfaceAs(item.answer!, scripts),
      alsoRight: item.alsoRight?.map((a) => writeSurfaceAs(a, scripts)),
      wrong: item.wrong?.map((w) => writeSurfaceAs(w, scripts)),
    }),
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
  ...(grammarJson as RawItem[]).map((raw) => resolve(raw, "grammar")),
];

/**
 * Kanji without a hand-written example borrow the shortest sentence in the
 * library that uses them: a word's example sentence or a grammar sentence.
 * (The sentences are the app's own, so kanji fetched later borrow from the
 * same ones.)
 */
const EXAMPLE_POOL: { example: Example; surface: string }[] = [
  ...LIBRARY.filter((i) => i.category === "vocab" && i.example).map((i) => i.example!),
  ...LIBRARY.filter((i) => i.category === "sentence").map((i) => ({ jp: i.jp, en: i.meaning[0] })),
]
  .map((example) => ({ example, surface: toSurface(example.jp) }))
  .sort((a, b) => a.surface.length - b.surface.length);

function borrowExample(item: StudyItem) {
  if (item.category === "kanji" && !item.example) {
    item.example = EXAMPLE_POOL.find((ex) => ex.surface.includes(item.surface))?.example;
  }
}

LIBRARY.forEach(borrowExample);

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

let revision = 0;

/**
 * How many fetched sets have joined the library since it was first built.
 * Anything worked out from the library and kept (a search index, a list of
 * synonyms) is out of date once this changes.
 */
export const libraryRevision = () => revision;

const addedSets = new Set<SetKey>();

/** Whether a fetched set's items have joined the library. */
export const hasSet = (key: SetKey) => addedSets.has(key);

/**
 * Adds a JLPT level's words from the dictionary to the library, as the sets
 * `dict-n<level>-<part>`. A word the library already teaches joins the set as
 * it is, keeping its example sentence and its progress, instead of appearing
 * twice. Returns false when the level was already added.
 */
export function addWordSet(file: SetFile): boolean {
  if (addedSets.has(`n${file.level}`)) return false;
  addedSets.add(`n${file.level}`);
  file.groups.forEach((rows, index) => {
    const group = wordSetGroupId(file.level, index + 1);
    const items: StudyItem[] = [];
    for (const row of rows) {
      if (typeof row === "string") {
        const taught = ITEMS_BY_ID.get(row);
        if (!taught) continue;
        if (!taught.groups.includes(group)) taught.groups.push(group);
        items.push(taught);
        continue;
      }
      const [entry, jp, meaning, pos] = row;
      const id = wordSetItemId(file.level, entry);
      let item = ITEMS_BY_ID.get(id);
      if (!item) {
        item = resolve({ id, group, jp, meaning, pos }, "vocab");
        LIBRARY.push(item);
        ITEMS_BY_ID.set(id, item);
        ITEMS_BY_CATEGORY.get("vocab")!.push(item);
      }
      items.push(item);
    }
    ITEMS_BY_GROUP.set(group, items);
  });
  revision++;
  return true;
}

/**
 * Adds the jōyō kanji the app doesn't carry itself, from KANJIDIC2, and files
 * every kanji under its JLPT and school-grade sets: the sets the app's own
 * kanji were already in grow to their full size, and the further parts of
 * the large levels appear. Returns false when already added.
 */
export function addKanjiSet(file: KanjiSetFile): boolean {
  if (addedSets.has("kanji")) return false;
  addedSets.add("kanji");

  // A kanji is in two sets: one of its JLPT level, one of its school grade.
  const groupsOf = new Map<string, string[]>();
  for (const [group, kanji] of Object.entries(file.groups)) {
    for (const literal of kanji) groupsOf.set(literal, [...(groupsOf.get(literal) ?? []), group]);
  }

  for (const [literal, on, kun, meaning] of file.items) {
    const id = `k-${literal}`;
    const groups = groupsOf.get(literal);
    if (ITEMS_BY_ID.has(id) || !groups) continue;
    const { jlpt, grade } = Object.assign({}, ...groups.map(kanjiSetOf));
    const item = { ...resolve({ id, jp: literal, meaning, on, kun, jlpt, grade }, "kanji"), groups };
    borrowExample(item);
    LIBRARY.push(item);
    ITEMS_BY_ID.set(id, item);
    ITEMS_BY_CATEGORY.get("kanji")!.push(item);
  }

  for (const [group, kanji] of Object.entries(file.groups)) {
    const items: StudyItem[] = [];
    for (const literal of kanji) {
      const item = ITEMS_BY_ID.get(`k-${literal}`);
      if (!item) continue;
      // The app's own kanji are filed where the dictionary's sets put them.
      item.groups = groupsOf.get(literal)!;
      items.push(item);
    }
    ITEMS_BY_GROUP.set(group, items);
  }
  revision++;
  return true;
}

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

/** Whether a group is drawn from a fetched set that hasn't joined the library yet. */
export function isPending(groupId: string): boolean {
  const key = setKeyOf(groupId);
  return !!key && !addedSets.has(key);
}

/**
 * How many items the groups hold. A set whose items haven't been fetched yet
 * counts with its size from the dictionary's summary, when that is given: a
 * kanji level then counts in full, not just the kanji the app carries.
 */
export function countForGroups(groupIds: Iterable<string>, sizes?: Record<string, number>): number {
  const ids = [...groupIds];
  const pending = sizes ? ids.filter((id) => isPending(id) && sizes[id] !== undefined) : [];
  const here = ids.filter((id) => !pending.includes(id));
  return itemsForGroups(here).length + pending.reduce((sum, id) => sum + sizes![id], 0);
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
