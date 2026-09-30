import { isHiragana, isKatakana, toHiragana, toKatakana } from "wanakana";
import { parseFurigana, toSurface } from "./furigana";

/** The scripts words, phrases and sentences may be written in. */
export type Script = "hiragana" | "katakana" | "kanji";

export const ALL_SCRIPTS: Script[] = ["hiragana", "katakana", "kanji"];

export const SCRIPT_INFO: Record<Script, { jp: string; en: string }> = {
  hiragana: { jp: "ひらがな", en: "Hiragana" },
  katakana: { jp: "カタカナ", en: "Katakana" },
  kanji: { jp: "漢字", en: "Kanji" },
};

/** True when the selection keeps normal Japanese writing (kanji plus both kana). */
export function isStandardWriting(scripts: readonly Script[]): boolean {
  return ALL_SCRIPTS.every((s) => scripts.includes(s));
}

/**
 * Rewrites furigana markup so it only uses the chosen scripts:
 * - Kanji chosen: words keep their kanji (with furigana). Otherwise each
 *   kanji word is replaced by its reading.
 * - Hiragana without katakana: katakana becomes hiragana (コーヒー → こーひー).
 * - Katakana without hiragana: hiragana becomes katakana (のみます → ノミマス).
 * - Both kana chosen: each stays as written, so loanwords remain in katakana.
 * Only kanji chosen keeps the kana as written too, since Japanese can't be
 * written in kanji alone.
 */
export function writeAs(markup: string, scripts: readonly Script[]): string {
  if (isStandardWriting(scripts)) return markup;
  const hira = scripts.includes("hiragana");
  const kata = scripts.includes("katakana");

  const convert = (text: string) =>
    [...text]
      .map((ch) => {
        if (isHiragana(ch) && ch !== "ー" && !hira && kata) return toKatakana(ch);
        if (isKatakana(ch) && ch !== "ー" && !kata && hira) return toHiragana(ch);
        return ch;
      })
      .join("");

  return parseFurigana(markup)
    .map((segment) => {
      if (!segment.ruby) return convert(segment.text);
      if (scripts.includes("kanji")) return `{${segment.text}|${segment.ruby}}`;
      // Kanji dropped: write the reading, in katakana if that's the only kana chosen.
      return hira ? segment.ruby : toKatakana(segment.ruby);
    })
    .join("");
}

/** The scripts a piece of Japanese uses, in the order kanji, hiragana, katakana. The long-vowel mark ー counts as neither kana. */
export function scriptsIn(text: string): Script[] {
  const found: Script[] = [];
  if (/[㐀-鿿々〆]/.test(text)) found.push("kanji");
  if (/[ぁ-ゖ]/.test(text)) found.push("hiragana");
  if (/[ァ-ヺ]/.test(text)) found.push("katakana");
  return found;
}

/** "kanji and hiragana" for 食べる: the scripts a piece of Japanese uses, as words. */
export function scriptNames(text: string): string {
  const names = scriptsIn(text).map((s) => SCRIPT_INFO[s].en.toLowerCase());
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Plain text of `writeAs`, without furigana. */
export function writeSurfaceAs(markup: string, scripts: readonly Script[]): string {
  return toSurface(writeAs(markup, scripts));
}
