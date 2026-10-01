// @ts-check

/**
 * How dictionary text is turned into search keys. The build script
 * (scripts/build-dictionary.mjs) and the app both use this file, so a key made
 * from what is typed always matches a key made from the dictionary. Plain
 * JavaScript, without imports, so Node can run it as it is.
 */

/**
 * Katakana as hiragana (タベル → たべる); everything else, including ー, is kept.
 * @param {string} text
 */
export function foldKana(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : ch;
  }
  return out;
}

const SEPARATORS = /[\s\u3000・･、。，,.!?！？~〜～「」『』()（）\-‐–—=＝]/g;

/**
 * The key for a Japanese word as written or as read: width and case
 * normalized, katakana folded to hiragana, separators removed.
 * @param {string} text
 */
export function japaneseKey(text) {
  return foldKana(text.normalize("NFKC")).replace(SEPARATORS, "").toLowerCase();
}

/** @param {string} ch */
const isKana = (ch) => /[ぁ-ゖァ-ヺー]/.test(ch);

const JAPANESE = /[぀-ヿ㐀-鿿々〆]/;

/**
 * Whether text holds any Japanese writing.
 * @param {string} text
 */
export const hasJapanese = (text) => JAPANESE.test(text);

/**
 * Words too common to look anything up by. An entry is still found by one of
 * them when it is the whole meaning ("in", "the").
 */
export const STOP_WORDS = new Set(
  "a an the to of in on at for and or with by as be is are etc eg esp usu sth sb one's".split(" "),
);

/**
 * Text without its notes in parentheses, including ones inside others:
 * "dog (Canis (lupus) familiaris)" → "dog ".
 * @param {string} text
 */
export function withoutNotes(text) {
  let out = text;
  for (let before = ""; before !== out; ) {
    before = out;
    out = out.replace(/\([^()]*\)/g, " ");
  }
  return out;
}

/**
 * A meaning reduced to what is compared: lower case, without notes in
 * parentheses, accents or punctuation, and without a leading "to", "a", "an"
 * or "the". "To live on (e.g. a salary)" → "live on".
 * @param {string} text
 */
export function plainMeaning(text) {
  return withoutNotes(text.normalize("NFKD"))
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/(^|\s)'+|'+(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(to|a|an|the) (?=.)/, "");
}

/**
 * The words of a plain meaning that an entry is indexed under.
 * @param {string} plain a meaning already passed through `plainMeaning`
 */
export function meaningWords(plain) {
  const words = plain.split(" ").filter(Boolean);
  // A meaning that is one word is indexed under it whatever the word.
  if (words.length <= 1) return words;
  return [...new Set(words.filter((word) => !STOP_WORDS.has(word) && (word.length > 1 || /\d/.test(word))))];
}

/** Kanji per file of kanji details: the files are named after the characters' code points. */
export const KANJI_CHUNK = 128;

/**
 * The file holding a kanji's details, under the dictionary's folder.
 * @param {string} kanji
 */
export const kanjiFile = (kanji) => `kd/${Math.floor((kanji.codePointAt(0) ?? 0) / KANJI_CHUNK).toString(16)}.json`;

/**
 * The id of a kanji set: a JLPT level ("n", 5 to 1) or a school grade ("g",
 * 1 to 6, and 8 for secondary school), and which part of it, from 1. The
 * first part keeps the plain id the set had before it was split.
 * @param {"n" | "g"} kind
 * @param {number} key
 * @param {number} part
 */
export const kanjiGroupId = (kind, key, part) => (part === 1 ? `kanji-${kind}${key}` : `kanji-${kind}${key}-${part}`);

/**
 * How an entry found through an English index matches, 0 the best. The
 * indexes store it with the entry, as `entry * MATCHES + match`.
 *   0: the word or phrase is the whole meaning, and the first one the entry gives
 *   1: the whole of another meaning of the first sense
 *   2: the whole of a meaning of a later sense
 *   3: one word of a meaning of the first sense
 *   4: one word of a meaning of a later sense
 */
export const MATCHES = 8;

/** Meanings of up to this many words are also indexed whole, so "ice cream" is found as a phrase. */
export const PHRASE_WORDS = 5;

/**
 * Furigana markup for a word from how it is written and how it is read:
 * 食べる + たべる → {食|た}べる. Kana in the written form anchors the reading;
 * when the two can't be lined up, the whole reading goes over the whole word.
 * @param {string} written
 * @param {string} reading
 */
export function furiganaMarkup(written, reading) {
  if (!reading || foldKana(written) === foldKana(reading)) return written;

  /** @type {{ text: string, kana: boolean }[]} */
  const runs = [];
  for (const ch of written) {
    const kana = isKana(ch);
    const last = runs[runs.length - 1];
    if (last && last.kana === kana) last.text += ch;
    else runs.push({ text: ch, kana });
  }
  if (runs.every((run) => run.kana)) return written;

  const pattern = runs.map((run) => (run.kana ? foldKana(run.text) : "(.+?)")).join("");
  const match = new RegExp(`^${pattern}$`, "u").exec(foldKana(reading));
  if (!match) return `{${written}|${reading}}`;

  // The folded reading has the same length as the reading itself, so the
  // matched pieces can be cut from the original, keeping any katakana.
  let out = "";
  let at = 0;
  let group = 1;
  for (const run of runs) {
    const length = run.kana ? run.text.length : match[group++].length;
    const piece = reading.slice(at, at + length);
    out += run.kana ? run.text : `{${run.text}|${piece}}`;
    at += length;
  }
  return out;
}
