import type { JlptLevel, PartOfSpeech } from "@/data/types";

/** One meaning of an entry, as stored in the dictionary files (see scripts/dictionary/build.mjs). */
export interface JmSense {
  /** Glosses: English words or phrases that all say this meaning. */
  g: string[];
  /** Parts of speech (JMdict codes). Left out when the same as the sense before. */
  p?: string[];
  /** Usage, field and dialect notes (JMdict codes): "usually written in kana", "archaic", "medicine"… */
  m?: string[];
  /** Notes in words. */
  i?: string[];
}

export interface JmEntry {
  /** JMdict entry number: the same from one release to the next. */
  s: number;
  /** Ways of writing it with kanji, the usual one first. */
  k?: string[];
  /** Readings, the one for the first written form first. */
  r: string[];
  e: JmSense[];
  /** Marked common in JMdict. */
  c?: 1;
  /** JLPT level. */
  j?: JlptLevel;
}

export interface DictMeta {
  /** Names the folder the other files are in; changes whenever the data does. */
  version: string;
  /** The date of the JMdict release. */
  date: string;
  entries: number;
  /** How many entries count as common (JLPT words included); they come first. */
  common: number;
  /** Entries per file: common ones, then the rest. */
  chunk: [number, number];
  /** The first key of each index file, in order: Japanese, English words, English phrases. */
  ja: string[];
  en: string[];
  ph: string[];
  /** Items in each fetched quiz set (JLPT words, kanji), by group id. */
  sets: Record<string, number>;
  /** Of those, the words the app's own library doesn't already teach; and their total. */
  setNewWords: Record<string, number>;
  newWords: number;
  /** How many kanji have details to look up. */
  kanji: number;
  /** What the JMdict codes stand for. */
  tags: Record<string, string>;
}

/** A file of an index: sorted keys, and for each the entries it leads to (delta-encoded). */
export interface IndexFile {
  k: string[];
  p: number[][];
}

/** A word in a JLPT set: the id of a word already in the library, or [entry, furigana markup, meanings, class]. */
export type SetRow = string | [number, string, string[], PartOfSpeech?];

export interface SetFile {
  level: JlptLevel;
  /** One list of words per part of the level. */
  groups: SetRow[][];
}

/** The kanji sets: the jōyō kanji the app doesn't carry, and which kanji each set holds. */
export interface KanjiSetFile {
  /** [kanji, on'yomi, kun'yomi, meanings] */
  items: [string, string[], string[], string[]][];
  /** Set id → its kanji, as one string, in order. */
  groups: Record<string, string>;
}

/** A kanji's details, as stored in the dictionary files (see scripts/dictionary/kanji.mjs). */
export interface KanjiDetails {
  /** On'yomi, in katakana. */
  o?: string[];
  /** Kun'yomi, in hiragana, okurigana after a dot (た.べる). */
  k?: string[];
  /** Meanings. */
  m?: string[];
  /** Strokes. */
  s?: number;
  /** School grade: 1 to 6, 8 for secondary school, 9 and 10 for kanji used in names. */
  g?: number;
  /** JLPT level, for jōyō kanji. */
  j?: JlptLevel;
  /** Rank among the 2,500 kanji most used in newspapers. */
  f?: number;
}

/** Fetches a dictionary file by its path under the dictionary folder, parsed. */
export type Loader = (path: string) => Promise<unknown>;
