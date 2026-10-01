import { furiganaMarkup } from "./keys.mjs";
import type { JmEntry } from "./types";

/** Plain names for the JMdict codes seen most; the rest fall back to JMdict's own descriptions. */
const LABELS: Record<string, string> = {
  n: "noun",
  "n-suf": "noun, as a suffix",
  "n-pref": "noun, as a prefix",
  pn: "pronoun",
  vs: "する verb",
  "vs-i": "する verb",
  "vs-s": "する verb (special)",
  vk: "くる verb",
  v1: "ichidan verb",
  "v1-s": "ichidan verb (くれる)",
  vt: "transitive",
  vi: "intransitive",
  "adj-i": "い-adjective",
  "adj-ix": "い-adjective (いい)",
  "adj-na": "な-adjective",
  "adj-no": "の-adjective",
  "adj-pn": "pre-noun adjectival",
  "adj-t": "たる-adjective",
  "adj-f": "used before a noun",
  adv: "adverb",
  "adv-to": "adverb with と",
  exp: "expression",
  int: "interjection",
  conj: "conjunction",
  prt: "particle",
  ctr: "counter",
  num: "number",
  pref: "prefix",
  suf: "suffix",
  aux: "auxiliary",
  "aux-v": "auxiliary verb",
  "aux-adj": "auxiliary adjective",
  cop: "copula",
  uk: "usually written in kana",
  abbr: "abbreviation",
  col: "colloquial",
  hon: "honorific",
  hum: "humble",
  pol: "polite",
  arch: "archaic",
  obs: "obsolete",
  sl: "slang",
  "net-sl": "internet slang",
  "on-mim": "sound or mimetic word",
  id: "idiom",
  yoji: "four-character idiom",
  fam: "familiar",
  fem: "used by women",
  male: "used by men",
  derog: "derogatory",
  vulg: "vulgar",
  chn: "children's word",
  form: "formal",
  dated: "dated",
  rare: "rare",
  hist: "historical",
  proverb: "proverb",
  joc: "humorous",
  poet: "poetic",
  sens: "sensitive",
};

/** What a JMdict code (part of speech, usage, field or dialect) means, in a few words. */
export function tagLabel(code: string, tags: Record<string, string> = {}): string {
  if (LABELS[code]) return LABELS[code];
  if (/^v5/.test(code)) return "godan verb";
  // JMdict's own wording, without its notes in parentheses: "noun (common) (futsuumeishi)".
  return (tags[code] ?? code).replace(/\s*\(.*?\)/g, "").trim() || code;
}

export interface Headword {
  /** How the word is usually written, with its reading as furigana markup. */
  markup: string;
  written: string;
  reading: string;
  /** Other ways it is written or read. */
  others: string[];
}

/**
 * What to show an entry under. The first kanji form with its reading, unless
 * the word is usually written in kana: then the kana, with the kanji listed
 * among the other forms.
 */
export function headword(entry: JmEntry): Headword {
  const [reading, ...readings] = entry.r;
  const [kanji, ...kanjis] = entry.k ?? [];
  if (!kanji || entry.e[0]?.m?.includes("uk")) {
    return { markup: reading, written: reading, reading, others: [...(entry.k ?? []), ...readings] };
  }
  return { markup: furiganaMarkup(kanji, reading), written: kanji, reading, others: [...kanjis, ...readings] };
}
