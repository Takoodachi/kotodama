import { kanjiReadingLabel, romajiLabel } from "@/data/library";
import type { Category, StudyItem } from "@/data/types";
import { pick, type Rng } from "@/lib/random";

export type Mode = "choice" | "reading" | "typing";
/** A quiz mode, or every card on one page at once (not a quiz session). */
export type PracticeMode = Mode | "grid";

/**
 * What the card shows → what the learner answers with. Grammar cards are
 * sentences with a gap: "cloze" is answered in Japanese, "cloze-romaji" in romaji.
 */
export type Direction = "jp-en" | "jp-romaji" | "romaji-jp" | "en-jp" | "cloze" | "cloze-romaji";

export const isCloze = (direction: Direction) => direction === "cloze" || direction === "cloze-romaji";

export type Side = "jp" | "romaji" | "en";

export const MODE_DIRECTIONS: Record<Mode, Direction[]> = {
  choice: ["jp-en", "jp-romaji", "romaji-jp", "en-jp"],
  reading: ["jp-romaji", "jp-en"],
  typing: ["en-jp", "romaji-jp"],
};

export const DEFAULT_DIRECTIONS: Record<Mode, Direction[]> = {
  choice: ["jp-en", "jp-romaji"],
  reading: ["jp-romaji", "jp-en"],
  typing: ["en-jp", "romaji-jp"],
};

export const DIRECTION_LABELS: Record<Direction, { from: string; to: string }> = {
  "jp-en": { from: "日本語", to: "English" },
  "jp-romaji": { from: "日本語", to: "Reading" },
  "romaji-jp": { from: "Romaji", to: "日本語" },
  "en-jp": { from: "English", to: "日本語" },
  cloze: { from: "文", to: "Gap" },
  "cloze-romaji": { from: "文", to: "Gap" },
};

/** What each direction asks, in plain words. */
export function directionDescription(direction: Direction, mode: Mode): string {
  const typed = mode !== "choice";
  switch (direction) {
    case "cloze":
    case "cloze-romaji":
      return typed ? "Type the missing word" : "Pick the missing word";
    case "jp-en":
      return typed ? "See Japanese, type the meaning in English" : "See Japanese, pick the meaning";
    case "jp-romaji":
      return typed ? "See Japanese, type how it's read in romaji" : "See Japanese, pick how it's read";
    case "romaji-jp":
      return typed ? "See romaji, type it in Japanese" : "See romaji, pick the Japanese";
    case "en-jp":
      return typed ? "See English, type it in Japanese" : "See English, pick the Japanese";
  }
}

export const MODE_INFO: Record<PracticeMode, { glyph: string; title: string; description: string }> = {
  choice: { glyph: "選", title: "Multiple choice", description: "Pick from four options." },
  reading: { glyph: "読", title: "Reading", description: "See Japanese, type the romaji or meaning." },
  typing: { glyph: "書", title: "Typing", description: "See English or romaji, type Japanese with your keyboard." },
  grid: { glyph: "覧", title: "All at once", description: "Every card on one page. Type what you know." },
};

/**
 * Modes offered on a device. Typing Japanese needs an IME, which phones and
 * tablets have built in; on a computer it adds little over reading mode.
 */
export function availableModes(touch: boolean): PracticeMode[] {
  return touch ? ["choice", "reading", "typing", "grid"] : ["choice", "reading", "grid"];
}

/** The quiz mode to run: saved typing falls back to multiple choice on a computer, as does the grid for quizzes. */
export function quizMode(mode: PracticeMode, touch: boolean): Mode {
  if (mode === "grid" || (mode === "typing" && !touch)) return "choice";
  return mode;
}

/** The practice mode shown as selected, given what this device offers. */
export function shownMode(mode: PracticeMode, touch: boolean): PracticeMode {
  return mode === "typing" && !touch ? "choice" : mode;
}

/** Kinds of item the all-at-once grid can show: short ones with a reading to type. */
export const GRID_CATEGORIES = new Set<Category>(["hiragana", "katakana", "kanji", "vocab"]);

export function promptSide(direction: Direction): Side {
  if (isCloze(direction)) return "jp";
  return direction.split("-")[0] as Side;
}

export function answerSide(direction: Direction): Side {
  if (direction === "cloze") return "jp";
  return direction.split("-")[1] as Side;
}

const isKana = (item: Pick<StudyItem, "category">) => item.category === "hiragana" || item.category === "katakana";

/** Which directions make sense for an item in a mode. */
export function supportedDirections(item: Pick<StudyItem, "category">, mode: Mode): Direction[] {
  // Grammar is always fill-in-the-gap; reading mode answers it in romaji.
  if (item.category === "grammar") return [mode === "reading" ? "cloze-romaji" : "cloze"];
  if (isKana(item)) return mode === "typing" ? ["romaji-jp"] : mode === "reading" ? ["jp-romaji"] : ["jp-romaji", "romaji-jp"];
  switch (mode) {
    case "choice":
      // Romaji → kanji is ambiguous (many kanji share a reading), so it is left out.
      return item.category === "kanji" ? ["jp-en", "jp-romaji", "en-jp"] : MODE_DIRECTIONS.choice;
    case "reading":
      // Free-typed English translations of whole sentences can't be graded reliably.
      return item.category === "sentence" ? ["jp-romaji"] : MODE_DIRECTIONS.reading;
    case "typing":
      return item.category === "kanji" ? ["en-jp"] : MODE_DIRECTIONS.typing;
  }
}

export interface DirectionLimit {
  /** "Kana", "Kanji" or "Sentences". */
  label: string;
  /** The directions these cards are asked in. */
  used: Direction[];
  reason: string;
}

const LIMITED: { label: string; categories: Category[]; reason: string }[] = [
  { label: "Kana", categories: ["hiragana", "katakana"], reason: "they have no English meaning" },
  { label: "Kanji", categories: ["kanji"], reason: "many kanji share a reading, so romaji can't point to one" },
  { label: "Sentences", categories: ["sentence"], reason: "a typed English translation can't be checked reliably" },
];

/**
 * Kinds of item in the selection that can't be asked some of the ways turned
 * on: which directions they're asked in instead, and why.
 */
export function directionLimits(
  categories: Iterable<Category>,
  mode: Mode,
  enabled: readonly Direction[],
): DirectionLimit[] {
  const present = new Set(categories);
  return LIMITED.flatMap(({ label, categories: kinds, reason }) => {
    if (!kinds.some((c) => present.has(c))) return [];
    const supported = supportedDirections({ category: kinds[0] }, mode);
    if (enabled.every((d) => supported.includes(d))) return [];
    const allowed = supported.filter((d) => enabled.includes(d));
    return [{ label, used: allowed.length ? allowed : supported, reason }];
  });
}

/** A direction the learner enabled and the item supports, or the item's first option. */
export function pickDirection(item: StudyItem, mode: Mode, enabled: readonly Direction[], rng: Rng): Direction {
  const supported = supportedDirections(item, mode);
  const allowed = supported.filter((d) => enabled.includes(d));
  return pick(allowed.length ? allowed : supported, rng);
}

/** Short instruction shown above the prompt. */
export function questionHint(item: StudyItem, direction: Direction, mode: Mode): string {
  const typed = mode !== "choice";
  switch (direction) {
    case "cloze":
      return typed ? "Type the missing word" : "Fill in the gap";
    case "cloze-romaji":
      return "Type the missing word in romaji";
    case "jp-en":
      return typed ? "Type the meaning in English" : "What does it mean?";
    case "jp-romaji":
      if (item.category === "kanji") return typed ? "Type any reading in romaji" : "How is it read?";
      return typed ? "Type the reading in romaji" : "How is it read?";
    case "romaji-jp":
      return typed ? "Type it in Japanese" : "Which one is it?";
    case "en-jp":
      if (typed) return item.category === "kanji" ? "Type the kanji (or its reading)" : "Type it in Japanese";
      return "Which one means this?";
  }
}

export function primaryMeaning(item: StudyItem): string {
  return item.category === "kanji" ? item.meaning.slice(0, 2).join(", ") : item.meaning[0];
}

/** Text of an item as a prompt, for the romaji and English sides. */
export function promptText(item: StudyItem, side: Exclude<Side, "jp">): string {
  if (side === "romaji") return romajiLabel(item);
  return item.meaning.slice(0, 3).join("; ");
}

/** Whether answer options are written in Japanese (a kanji's readings are, in kana). */
export function answersInJapanese(item: StudyItem, direction: Direction): boolean {
  const side = answerSide(direction);
  return side === "jp" || (side === "romaji" && item.category === "kanji");
}

/** How an item appears as a multiple-choice option. */
export function answerLabel(item: StudyItem, side: Side): { label: string; sublabel?: string } {
  switch (side) {
    case "en":
      return { label: primaryMeaning(item) };
    case "romaji":
      if (item.category === "kanji") return kanjiReadingLabel(item);
      return { label: romajiLabel(item) };
    case "jp":
      return { label: item.surface };
  }
}
