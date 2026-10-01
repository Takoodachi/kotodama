import type { JlptLevel } from "./types";
import { wordSetLevel } from "./wordSets";

/**
 * Parts of the library that aren't bundled with the app but fetched from the
 * dictionary's files when first needed: each JLPT level's words (see
 * ./wordSets), and the kanji beyond the few hundred the app carries itself
 * (see ./kanjiSets). An id says which file its set or item is in, so what to
 * fetch is known from the id alone.
 */
export type SetKey = `n${JlptLevel}` | "kanji";

/** A kanji set ("kanji-n3-2") or a kanji item ("k-語"; katakana items are "k-カ"). */
const KANJI = /^kanji-|^k-\p{Script=Han}$/u;

/** The fetched file a group or item belongs to, if any. */
export function setKeyOf(id: string): SetKey | null {
  const level = wordSetLevel(id);
  if (level) return `n${level}`;
  return KANJI.test(id) ? "kanji" : null;
}

const ORDER: SetKey[] = ["n5", "n4", "n3", "n2", "n1", "kanji"];

/** The files needed for a selection of groups and a list of item ids. */
export function setKeys(ids: Iterable<string>): SetKey[] {
  const keys = new Set<SetKey>();
  for (const id of ids) {
    const key = setKeyOf(id);
    if (key) keys.add(key);
  }
  return ORDER.filter((key) => keys.has(key));
}

/** Where the file is, under the dictionary's folder. */
export const setFile = (key: SetKey) => `sets/${key}.json`;

/** What a file holds, for messages: "N5 words", "kanji". */
export const setLabel = (key: SetKey) => (key === "kanji" ? "kanji" : `N${key[1]} words`);
