import { toHiragana, toRomaji } from "wanakana";

const PUNCTUATION =
  /[\s　.,!?;:'"`~()\[\]{}\-‐–—（）「」『』【】［］、。！？・…〜～♪’‘“”]/g;

export function stripPunctuation(text: string): string {
  return text.replace(PUNCTUATION, "");
}

const VOWEL_KANA: Record<string, string> = { a: "あ", i: "い", u: "う", e: "え", o: "お" };

/** Replaces the long-vowel mark with the vowel it lengthens: こーひー → こおひい. */
export function expandLongVowelMark(kana: string): string {
  let out = "";
  for (const ch of kana) {
    if (ch === "ー" && out) {
      const vowel = toRomaji(out.slice(-1)).slice(-1);
      out += VOWEL_KANA[vowel] ?? ch;
    } else {
      out += ch;
    }
  }
  return out;
}

const MACRONS: Record<string, string> = {
  ā: "aa", ī: "ii", ū: "uu", ē: "ee", ō: "ou",
  â: "aa", î: "ii", û: "uu", ê: "ee", ô: "ou",
};

/**
 * Lowercases romaji and smooths out spelling differences that wanakana does not
 * handle itself: macrons (gakkō), a doubled n before a consonant (sennsei), and
 * the traditional m before b/p (shimbun).
 */
export function normalizeRomaji(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[āīūēōâîûêô]/g, (c) => MACRONS[c])
    .replace(/[’‘`]/g, "'")
    .replace(/nn(?![aiueoy])/g, "n")
    .replace(/m(?=[bp])/g, "n");
}

/**
 * A spelling-independent key for comparing readings. It accepts romaji or kana
 * input. shi/si, tsu/tu and ji/zi collapse to one form, and so do the ou/oo and
 * ei/ee long-vowel spellings.
 */
export function readingKey(input: string): string {
  const kana = toHiragana(normalizeRomaji(input), { convertLongVowelMark: false });
  const expanded = expandLongVowelMark(stripPunctuation(kana));
  return toRomaji(expanded)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/ou/g, "oo")
    .replace(/ei/g, "ee");
}

/** Romaji compared literally apart from case, spacing, punctuation and macrons. */
export function literalRomajiKey(input: string): string {
  return normalizeRomaji(input).replace(/[^a-z]/g, "");
}

/** Normalizes typed Japanese. Katakana is folded to hiragana unless `strict` is set. */
export function japaneseKey(input: string, strict = false): string {
  const text = stripPunctuation(input.normalize("NFKC"));
  return strict ? text : toHiragana(text, { passRomaji: true, convertLongVowelMark: false });
}

export function normalizeEnglish(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/'/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(to|a|an|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Edit distance where swapping two adjacent letters ("friut") counts as one edit. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Kanji reading notation to plain kana: `た.べる` → `たべる`, `-び` → `び`. */
export function cleanKanjiReading(reading: string): string {
  return reading.replace(/[.\-]/g, "");
}
