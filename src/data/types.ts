export type Category = "hiragana" | "katakana" | "kanji" | "vocab" | "phrase" | "sentence";

export type PartOfSpeech =
  | "noun"
  | "pronoun"
  | "verb"
  | "i-adj"
  | "na-adj"
  | "adverb"
  | "expression"
  | "counter";

export type JlptLevel = 1 | 2 | 3 | 4 | 5;

/** Shape of an entry in the JSON content files. */
export interface RawItem {
  id: string;
  /** Selectable set this item belongs to. Kanji derive theirs from `jlpt` / `grade`. */
  group?: string;
  /**
   * Japanese text. Vocab, phrases and sentences use furigana markup:
   * `{食|た}べる` → 食 with た above it, followed by べる.
   */
  jp: string;
  /** Kana reading. Derived from the furigana markup when omitted. */
  reading?: string;
  /** Accepted romanizations; the first is shown. Derived from the reading when omitted. */
  romaji?: string[];
  /** English meanings; the first is the primary one. Empty for kana. */
  meaning: string[];
  /** Kanji only: on'yomi in katakana. */
  on?: string[];
  /** Kanji only: kun'yomi in hiragana, okurigana after a dot (た.べる). */
  kun?: string[];
  jlpt?: JlptLevel;
  /** School grade 1–6, or 8 for secondary school. */
  grade?: number;
  pos?: PartOfSpeech;
  /** Text sent to speech synthesis when it differs from the default. */
  speech?: string;
}

/** A short sentence that uses a word or kanji in context. */
export interface Example {
  /** Furigana markup, like `jp` on items. */
  jp: string;
  en: string;
}

/** A fully resolved library entry. */
export interface StudyItem extends RawItem {
  /** Example sentence (words and kanji only). */
  example?: Example;
  category: Category;
  /** Every selectable group this item belongs to. */
  groups: string[];
  /** Plain text with furigana markup removed. */
  surface: string;
  reading: string;
  romaji: string[];
}

export type KanaKind = "main" | "dakuten" | "handakuten" | "combo" | "extended";
