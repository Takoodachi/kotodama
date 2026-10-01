import { toHiragana } from "wanakana";
import { LIBRARY } from "@/data/library";
import type { Category, StudyItem } from "@/data/types";
import { readingKey, stripPunctuation } from "@/lib/japanese";
import { isUnlocked, type SrsRecord } from "@/lib/srs";

/**
 * The dictionary is the library's words, phrases and sentences, looked up in
 * either direction: Japanese (kanji, kana or romaji) to English, or English
 * to Japanese. An entry is "unlocked" once it has been answered right in a
 * quiz; unlocked entries are the ones that can be consulted during a quiz.
 */
export const DICTIONARY_CATEGORIES: Category[] = ["vocab", "phrase", "sentence"];

const KINDS = new Set(DICTIONARY_CATEGORIES);

export const inDictionary = (item: Pick<StudyItem, "category">) => KINDS.has(item.category);

interface Entry {
  item: StudyItem;
  /** Written form without punctuation, and the same with katakana as hiragana. */
  surface: string;
  surfaceKana: string;
  /** Reading in hiragana, without punctuation or spaces. */
  kana: string;
  /** Accepted romanizations, letters only, and the reading in a spelling-neutral form (see `readingKey`). */
  romaji: string[];
  /** Meanings in lower case, with and without notes in parentheses and a leading "to". */
  meanings: string[];
  /** Every word of the meanings. */
  words: string[];
}

const kanaKey = (text: string) => toHiragana(stripPunctuation(text), { passRomaji: true, convertLongVowelMark: false });
const letters = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
const plainMeaning = (meaning: string) =>
  meaning
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function toEntry(item: StudyItem): Entry {
  const meanings = item.meaning.flatMap((m) => {
    const plain = plainMeaning(m);
    return [plain, plain.replace(/^(to|a|an|the) /, "")];
  });
  return {
    item,
    surface: stripPunctuation(item.surface),
    surfaceKana: kanaKey(item.surface),
    kana: kanaKey(item.reading),
    romaji: [...new Set([...item.romaji.map(letters), readingKey(item.reading)])],
    meanings: [...new Set(meanings)],
    words: [...new Set(meanings.flatMap((m) => m.split(/[\s-]+/)))],
  };
}

const KIND_ORDER: Partial<Record<Category, number>> = { vocab: 0, phrase: 1, sentence: 2 };

/** Every entry, in dictionary (kana) order; words come before phrases and sentences that read the same. */
const ENTRIES: Entry[] = LIBRARY.filter(inDictionary)
  .map(toEntry)
  .sort(
    (a, b) =>
      a.kana.localeCompare(b.kana, "ja") || KIND_ORDER[a.item.category]! - KIND_ORDER[b.item.category]!,
  );

export const DICTIONARY: StudyItem[] = ENTRIES.map((entry) => entry.item);

const NO_MATCH = Infinity;

/** How well a Japanese query (kanji or kana) matches: 0 exact, 1 starts with, 2 contains. */
function japaneseScore(entry: Entry, query: string, queryKana: string): number {
  if (entry.surface === query || entry.kana === queryKana || entry.surfaceKana === queryKana) return 0;
  if (entry.surface.startsWith(query) || entry.kana.startsWith(queryKana) || entry.surfaceKana.startsWith(queryKana)) {
    return 1;
  }
  if (entry.surface.includes(query) || entry.kana.includes(queryKana) || entry.surfaceKana.includes(queryKana)) return 2;
  return NO_MATCH;
}

/**
 * How well a query in Latin letters matches, as English or as romaji:
 * 0 a whole meaning or reading, 1 a whole word of a meaning or the start of
 * one, 2 the start of a word or of the reading, 3 anywhere inside.
 */
function latinScore(entry: Entry, query: string, romaji: string[]): number {
  let score = NO_MATCH;
  if (!query) return score;
  if (entry.meanings.includes(query)) score = 0;
  else if (entry.words.includes(query) || entry.meanings.some((m) => m.startsWith(query))) score = 1;
  else if (entry.words.some((w) => w.startsWith(query))) score = 2;
  else if (query.length >= 3 && entry.meanings.some((m) => m.includes(query))) score = 3;

  for (const typed of romaji) {
    if (entry.romaji.includes(typed)) score = Math.min(score, 0);
    else if (typed.length >= 2 && entry.romaji.some((r) => r.startsWith(typed))) score = Math.min(score, 2);
    else if (typed.length >= 3 && entry.romaji.some((r) => r.includes(typed))) score = Math.min(score, 3);
  }
  return score;
}

const JAPANESE = /[぀-ヿ㐀-鿿々]/;

/**
 * Looks a word up. Japanese text is matched against how entries are written
 * and read; Latin letters against their meanings and their romaji. The best
 * matches come first: exact, then starting with the query, then containing
 * it; shorter entries before longer ones. An empty query lists everything in
 * kana order. `among` limits the search to some entries (the unlocked ones,
 * say).
 */
export function searchDictionary(query: string, among?: (item: StudyItem) => boolean): StudyItem[] {
  const entries = among ? ENTRIES.filter((entry) => among(entry.item)) : ENTRIES;
  const typed = query.normalize("NFKC").trim().toLowerCase();
  if (!typed) return entries.map((entry) => entry.item);

  const japanese = JAPANESE.test(typed);
  const text = stripPunctuation(typed);
  const queryKana = kanaKey(typed);
  const plain = plainMeaning(typed);
  // Romaji as typed, and in the spelling-neutral form, so "si" finds し and "toukyou" finds とうきょう.
  const romaji = [...new Set([letters(typed), readingKey(typed)])].filter(Boolean);
  return entries
    .map((entry) => ({
      entry,
      score: japanese ? japaneseScore(entry, text, queryKana) : latinScore(entry, plain, romaji),
    }))
    .filter(({ score }) => score !== NO_MATCH)
    .sort(
      (a, b) =>
        a.score - b.score ||
        KIND_ORDER[a.entry.item.category]! - KIND_ORDER[b.entry.item.category]! ||
        a.entry.surface.length - b.entry.surface.length,
    )
    .map(({ entry }) => entry.item);
}

/** Ids of the dictionary entries answered right at least once. */
export function unlockedEntries(records: Record<string, SrsRecord>): Set<string> {
  return new Set(DICTIONARY.filter((item) => isUnlocked(records[item.id])).map((item) => item.id));
}
