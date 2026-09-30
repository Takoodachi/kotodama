export type Category = "hiragana" | "katakana" | "kanji" | "vocab" | "phrase" | "sentence" | "grammar";

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
  /** Romaji to show instead of the first accepted one, e.g. "ji (di)" for ぢ. */
  romajiLabel?: string;
  /** A short tip shown with the answer. */
  note?: string;
  /** Kana that sounds the same and is also accepted when this one is typed from its romaji (ぢ for "ji"). */
  sameSound?: string;
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

  /**
   * Grammar only. `jp` is the sentence with ＿ where a word is missing;
   * `answer` fills it (kana), `alsoRight` lists other correct fillers, and
   * `wrong` holds believable wrong ones for multiple choice.
   */
  answer?: string;
  alsoRight?: string[];
  wrong?: string[];
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
  /** Grammar only: the sentence with ＿ for the gap (furigana markup). `jp` is the whole sentence. */
  cloze?: string;
  /**
   * How the item is normally written (furigana markup), set by `writtenItem`
   * when the chosen scripts show it differently: タベル is usually 食べる.
   */
  usual?: string;
}

export type KanaKind = "main" | "dakuten" | "handakuten" | "combo" | "extended";
