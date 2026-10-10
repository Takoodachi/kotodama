import { isKana, toHiragana } from "wanakana";
import type { CustomRaw } from "@/data/library";
import { normalizeRomaji, stripPunctuation } from "@/lib/japanese";
import { foldKana, hasJapanese, partOfSpeech, quizMeanings } from "@/lib/jmdict/keys.mjs";
import { headword } from "@/lib/jmdict/labels";
import type { JmEntry } from "@/lib/jmdict/types";

/**
 * A quiz of the learner's own making, built an item at a time. Most items are
 * ones the library has or can fetch (its own words, a JLPT level's). The rest
 * are kept with the quiz, in the shape below: dictionary words that are in
 * none of the sets, and entries the learner wrote for what the dictionary
 * lacks, be it a word, a phrase or a sentence.
 */
export type CustomItem = CustomRaw;

export type OwnKind = CustomItem["category"];

/** Entries the learner wrote are "own-…"; dictionary words outside every set are "jmd-<entry number>". */
export const isOwnId = (id: string) => id.startsWith("own-");
export const dictionaryWordId = (entry: number) => `jmd-${entry}`;

/**
 * A dictionary word as a quiz item: written and read the way its entry is
 * shown, with the meanings a card wants (see `quizMeanings`).
 */
export function entryItem(entry: JmEntry): CustomItem {
  const [main, ...rest] = entry.e;
  const pos = partOfSpeech(main.p ?? []);
  return {
    id: dictionaryWordId(entry.s),
    category: "vocab",
    jp: headword(entry).markup,
    meaning: quizMeanings(
      main.g,
      rest.map((sense) => ({ gloss: sense.g[0], misc: sense.m ?? [] })),
    ),
    ...(pos && { pos }),
    // An expression may end in a particle (それでは), and nobody wrote its romaji out.
    ...(pos === "expression" && { saidParticles: true }),
  };
}

/** What the learner fills in for an entry of their own. */
export interface OwnDraft {
  kind: OwnKind;
  /** How it is written in Japanese. */
  japanese: string;
  /** How it is read, in kana or romaji. Only asked for when the writing has more than kana in it. */
  reading: string;
  /** What it means in English; semicolons separate different meanings. */
  meaning: string;
}

export interface OwnProblem {
  field: "japanese" | "reading" | "meaning";
  message: string;
}

/**
 * Romaji as hiragana, or null when the text isn't romaji through and through:
 * "taberu" is, "eat" leaves a t over.
 */
export function romajiToKana(text: string): string | null {
  const letters = normalizeRomaji(text).replace(/[^a-z'-]/g, "");
  if (!letters) return null;
  const kana = toHiragana(letters);
  return isKana(kana) ? kana : null;
}

const KANA = /[ぁ-ゖァ-ヺー]/;
const isSilent = (ch: string) => stripPunctuation(ch) === "";

/** Whether the text has anything kana alone doesn't say how to read: kanji, digits, Latin letters. */
export function needsReading(japanese: string): boolean {
  return [...japanese].some((ch) => !isSilent(ch) && !KANA.test(ch));
}

/** A first guess at what was typed, from its length and how it ends; the learner can say otherwise. */
export function guessKind(text: string): OwnKind {
  const typed = text.trim();
  if (/[。.!?！？]$/.test(typed)) return "sentence";
  if (hasJapanese(typed)) {
    const length = [...stripPunctuation(typed)].length;
    return length <= 8 ? "vocab" : length <= 14 ? "phrase" : "sentence";
  }
  const words = typed.split(/\s+/).filter(Boolean).length;
  return words <= 1 ? "vocab" : words <= 3 ? "phrase" : "sentence";
}

/**
 * The form for a new entry, started from what was searched for: Japanese is
 * how it's written, romaji how it's read (and, in kana, perhaps how it's
 * written too), and anything else is taken for its meaning.
 */
export function draftFrom(query: string): OwnDraft {
  const typed = query.trim().replace(/\s+/g, " ");
  const kind = guessKind(typed);
  if (hasJapanese(typed)) return { kind, japanese: typed, reading: "", meaning: "" };
  const kana = romajiToKana(typed);
  if (kana) return { kind, japanese: kana, reading: typed, meaning: "" };
  return { kind, japanese: "", reading: "", meaning: typed };
}

/** As particles は, へ and を are said wa, e and o, and a reading may be typed that way. */
const SAID: Record<string, string> = { は: "[はわ]", へ: "[へえ]", を: "[をお]" };

/**
 * Furigana markup for the learner's own text: `furiganaMarkup` for whole
 * phrases and sentences. Punctuation and spaces are passed over, and a reading
 * typed as it is said (わ for the particle は) still lines up with the
 * writing. When the two can't be lined up, the whole reading goes over the
 * whole text.
 */
export function ownMarkup(written: string, reading: string): string {
  type Run = { text: string; kind: "kana" | "silent" | "other" };
  const runs: Run[] = [];
  for (const ch of written) {
    const kind = isSilent(ch) ? "silent" : KANA.test(ch) ? "kana" : "other";
    const last = runs.at(-1);
    if (last?.kind === kind) last.text += ch;
    else runs.push({ text: ch, kind });
  }
  // Kanji either side of a comma have nothing between them to say where one reading ends: they share one.
  for (let i = runs.length - 2; i >= 1; i--) {
    if (runs[i].kind === "silent" && runs[i - 1].kind === "other" && runs[i + 1].kind === "other") {
      runs[i - 1].text += runs[i].text + runs[i + 1].text;
      runs.splice(i, 2);
    }
  }
  if (!reading || !runs.some((run) => run.kind === "other")) return written;

  const pattern = runs
    .map((run) => {
      if (run.kind === "silent") return "";
      if (run.kind === "other") return "(.+?)";
      return [...foldKana(run.text)].map((ch) => SAID[ch] ?? ch).join("");
    })
    .join("");
  const match = new RegExp(`^${pattern}$`, "u").exec(foldKana(reading));
  if (!match) return `{${written}|${reading}}`;
  let group = 1;
  return runs.map((run) => (run.kind === "other" ? `{${run.text}|${match[group++]}}` : run.text)).join("");
}

/**
 * The entry a filled-in form makes, or what is still wrong with the form.
 * Without a Japanese keyboard, romaji will do for the writing: it becomes kana.
 */
export function ownItem(draft: OwnDraft, id: string): CustomItem | OwnProblem {
  let japanese = draft.japanese.trim().replace(/\s+/g, " ");
  // Romaji as the learner typed it reads better than what the kana would give back: "watashi wa", not "watashiha".
  let romaji: string | null = null;
  if (!japanese) return { field: "japanese", message: "Write how it's written in Japanese." };
  if (/[{}|]/.test(japanese)) return { field: "japanese", message: "Leave out the brackets and bars: { } |" };
  if (!hasJapanese(japanese)) {
    const kana = romajiToKana(japanese);
    if (!kana) return { field: "japanese", message: "Write it in Japanese (kana or kanji), or spell it out in romaji." };
    romaji = japanese;
    japanese = kana;
  }

  let reading = "";
  if (needsReading(japanese)) {
    const typed = draft.reading.trim();
    if (!typed) return { field: "reading", message: "Add how it's read, in kana or romaji: kanji alone don't say." };
    if (hasJapanese(typed)) {
      reading = stripPunctuation(typed);
      if (!isKana(reading)) return { field: "reading", message: "Write the reading in kana only, or in romaji." };
    } else {
      const kana = romajiToKana(typed);
      if (!kana) return { field: "reading", message: "That isn't romaji. Write the reading in kana or romaji." };
      reading = kana;
      romaji = typed;
    }
  }

  const meaning = draft.meaning
    .split(/[;；]/)
    .map((m) => m.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (!meaning.length) return { field: "meaning", message: "Add what it means in English." };

  return {
    id,
    category: draft.kind,
    jp: ownMarkup(japanese, reading),
    meaning,
    ...(romaji && { romaji: [normalizeRomaji(romaji).replace(/\s+/g, " ")] }),
    // Nobody wrote the romaji out particle by particle, so こんにちは may be typed "konnichiwa".
    saidParticles: true,
  };
}
