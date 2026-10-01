import { toHiragana } from "wanakana";
import { normalizeRomaji } from "@/lib/japanese";
import { hasJapanese, japaneseKey, MATCHES, meaningWords, plainMeaning } from "./keys.mjs";
import type { DictMeta, IndexFile, JmEntry, Loader } from "./types";

/**
 * Looking words up in the full dictionary (JMdict). Its 200,000 entries are
 * never downloaded whole: a lookup fetches the one or two index files that
 * cover what was typed, then the few small files holding the entries shown.
 * The files are made by scripts/build-dictionary.mjs.
 */

/** An entry found by a search. */
export interface Hit {
  /** Where the entry is in the dictionary, counted from the most common. */
  at: number;
  /**
   * How well it matches; lower is better.
   * 0: written or read exactly as typed, or what was typed is the first meaning given.
   * 1, 2: what was typed is the whole of another meaning: of the first sense, of a later one.
   * 3: starts with what was typed, or has it as one word of a meaning of the first sense.
   * 4: has it as one word of a meaning of a later sense.
   * 5 and up: looser still: a longer word that starts with what was typed, or
   *   the words of a phrase found apart from each other.
   */
  rank: number;
  /** For a word that starts with what was typed, how much longer it is. */
  extra: number;
}

/** Starts with what was typed, rather than being it. */
const STARTS_WITH = 3;
/** Added to a match made through a longer word than the one typed ("eating" for "eat"). */
const LONGER_WORD = 5;
/** Has every word of the phrase typed, though not as one of its meanings. */
const WORDS_APART = 5;

/** Index files read for one key: a short prefix can run across several. */
const MAX_FILES = 3;
/** Most keys taken that start with what was typed: Japanese words, longer English words, longer phrases. */
const MAX_WORDS = 300;
const MAX_LONGER_WORDS = 40;
const MAX_LONGER_PHRASES = 60;

/** The index of the last file whose first key is not after `key`. */
function fileOf(firsts: readonly string[], key: string): number {
  let low = 0;
  let high = firsts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (firsts[mid] <= key) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** The first index in sorted `keys` that is not before `key`. */
function lowerBound(keys: readonly string[], key: string): number {
  let low = 0;
  let high = keys.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (keys[mid] < key) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Undoes the index files' delta encoding: first value, then differences. */
function decode(deltas: readonly number[]): number[] {
  let value = 0;
  return deltas.map((delta) => (value += delta));
}

function keepBetter(hits: Map<number, Hit>, hit: Hit) {
  const had = hits.get(hit.at);
  if (!had || hit.rank < had.rank || (hit.rank === had.rank && hit.extra < had.extra)) hits.set(hit.at, hit);
}

/**
 * The kana that romaji stands for, if it is romaji: "taberu" → たべる. Long
 * vowels are also tried with the long-vowel mark, the way loanwords are
 * spelled: "koohii" → こおひい and こーひー.
 */
export function romajiKeys(typed: string): string[] {
  const letters = normalizeRomaji(typed).replace(/\s+/g, "");
  if (!/^[a-z'-]+$/.test(letters)) return [];
  const marked = letters.replace(/([aiueo])\1|ou|ei/g, (long) => `${long[0]}-`);
  return [...new Set([letters, marked].map((romaji) => toHiragana(romaji)))].filter((kana) => /^[ぁ-ゖー]+$/.test(kana));
}

export class Dictionary {
  constructor(
    readonly meta: DictMeta,
    private readonly load: Loader,
  ) {}

  /** Best matches first; among equals, common words before rare ones. */
  private readonly order = (a: Hit, b: Hit) =>
    a.rank - b.rank ||
    Number(a.at >= this.meta.common) - Number(b.at >= this.meta.common) ||
    a.extra - b.extra ||
    a.at - b.at;

  /** The entries at the given positions, in that order. */
  async entries(positions: readonly number[]): Promise<JmEntry[]> {
    const { common, chunk } = this.meta;
    const where = positions.map((at) =>
      at < common
        ? { path: `e/c${Math.floor(at / chunk[0])}.json`, index: at % chunk[0] }
        : { path: `e/r${Math.floor((at - common) / chunk[1])}.json`, index: (at - common) % chunk[1] },
    );
    const paths = [...new Set(where.map((w) => w.path))];
    const files = new Map(
      await Promise.all(paths.map(async (path) => [path, (await this.load(path)) as JmEntry[]] as const)),
    );
    return where.map((w) => files.get(w.path)![w.index]);
  }

  /** The key itself and, up to `longer` of them, the keys that start with it, from one of the indexes. */
  private async keys(
    index: "ja" | "en" | "ph",
    key: string,
    longer: number,
  ): Promise<{ key: string; values: number[] }[]> {
    const firsts = this.meta[index];
    const found: { key: string; values: number[] }[] = [];
    for (let n = fileOf(firsts, key), files = 0; n < firsts.length && files < MAX_FILES; n++, files++) {
      const file = (await this.load(`${index}/${n}.json`)) as IndexFile;
      for (let i = lowerBound(file.k, key); i < file.k.length; i++) {
        const exact = file.k[i] === key;
        // Keys are sorted, so the ones starting with `key` come in a row and nothing follows them.
        if (!exact && !(longer && file.k[i].startsWith(key))) return found;
        found.push({ key: file.k[i], values: decode(file.p[i]) });
        if (found.length > longer) return found;
      }
      // Ran off the end of the file: the row may carry on in the next one.
      if (!longer) break;
    }
    return found;
  }

  /** Entries written or read as `key`, or starting with it. */
  private async japanese(key: string): Promise<Hit[]> {
    const hits = new Map<number, Hit>();
    if (!key) return [];
    for (const found of await this.keys("ja", key, MAX_WORDS)) {
      const rank = found.key === key ? 0 : STARTS_WITH;
      for (const at of found.values) keepBetter(hits, { at, rank, extra: found.key.length - key.length });
    }
    return [...hits.values()];
  }

  /** Entries with `word` in a meaning, by how well it matches (see MATCHES). */
  private async word(word: string, mayBeHalfTyped: boolean): Promise<Map<number, number>> {
    const matches = new Map<number, number>();
    const longer = mayBeHalfTyped && word.length >= 3 ? MAX_LONGER_WORDS : 0;
    for (const found of await this.keys("en", word, longer)) {
      const looser = found.key === word ? 0 : LONGER_WORD;
      for (const value of found.values) {
        const at = Math.floor(value / MATCHES);
        const match = (value % MATCHES) + looser;
        if (!(matches.get(at)! <= match)) matches.set(at, match);
      }
    }
    return matches;
  }

  /** Entries that mean `plain`: by a meaning that is exactly it, or by having each of its words. */
  private async english(plain: string): Promise<Hit[]> {
    if (!plain) return [];
    // Words too common to search by ("by the way" → "way") are left to the phrase lookup below.
    const words = meaningWords(plain);
    // The last word may still be half typed, so longer words that start with it count, a little less.
    const lists = await Promise.all(words.map((word, i) => this.word(word, i === words.length - 1)));
    if (!plain.includes(" ")) return [...(lists[0] ?? [])].map(([at, rank]) => ({ at, rank, extra: 0 }));

    const hits = new Map<number, Hit>();
    // Several words. An entry with all of them somewhere in its meanings is a loose match…
    const [smallest = new Map<number, number>(), ...others] = lists.sort((a, b) => a.size - b.size);
    for (const [at, first] of smallest) {
      let weakest = first;
      for (const other of others) weakest = Math.max(weakest, other.get(at) ?? Infinity);
      if (weakest !== Infinity) hits.set(at, { at, rank: WORDS_APART + (weakest >= LONGER_WORD ? 1 : 0), extra: 0 });
    }
    // …and one with the phrase as a meaning ("ice cream"), or starting one ("ice cream cone"), a close one.
    for (const found of await this.keys("ph", plain, MAX_LONGER_PHRASES)) {
      const exact = found.key === plain;
      for (const value of found.values) {
        const match = value % MATCHES;
        const rank = exact ? match : STARTS_WITH + (match > 1 ? 1 : 0);
        keepBetter(hits, { at: Math.floor(value / MATCHES), rank, extra: found.key.length - plain.length });
      }
    }
    return [...hits.values()];
  }

  /**
   * Looks up what was typed. Japanese text is matched against how entries are
   * written and read; Latin letters against their meanings, and as romaji
   * against their readings. The best matches come first.
   */
  async search(query: string): Promise<Hit[]> {
    const typed = query.normalize("NFKC").trim();
    if (!typed) return [];
    const hits = new Map<number, Hit>();
    if (hasJapanese(typed)) {
      // Letters still on their way through an IME (たべr) are left off.
      for (const hit of await this.japanese(japaneseKey(typed).replace(/[a-z]+$/, ""))) keepBetter(hits, hit);
    } else {
      const found = await Promise.all([
        this.english(plainMeaning(typed)),
        ...romajiKeys(typed).map((kana) => this.japanese(japaneseKey(kana))),
      ]);
      for (const hit of found.flat()) keepBetter(hits, hit);
    }
    return [...hits.values()].sort(this.order);
  }
}
