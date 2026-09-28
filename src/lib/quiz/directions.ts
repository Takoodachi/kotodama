import { kanjiReadingLabel } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { pick, type Rng } from "@/lib/random";

export type Mode = "choice" | "reading" | "typing";

/** What the card shows → what the learner answers with. */
export type Direction = "jp-en" | "jp-romaji" | "romaji-jp" | "en-jp";

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
};

export const MODE_INFO: Record<Mode, { glyph: string; title: string; description: string }> = {
  choice: { glyph: "選", title: "Multiple choice", description: "Pick from four options. Best on a phone." },
  reading: { glyph: "読", title: "Reading", description: "See Japanese, type the romaji or meaning." },
  typing: { glyph: "書", title: "Typing", description: "See English or romaji, type Japanese." },
};

export function promptSide(direction: Direction): Side {
  return direction.split("-")[0] as Side;
}

export function answerSide(direction: Direction): Side {
  return direction.split("-")[1] as Side;
}

const isKana = (item: StudyItem) => item.category === "hiragana" || item.category === "katakana";

/** Which directions make sense for an item in a mode. */
export function supportedDirections(item: StudyItem, mode: Mode): Direction[] {
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
  if (side === "romaji") return item.romaji[0];
  return item.meaning.slice(0, 3).join("; ");
}

/** How an item appears as a multiple-choice option. */
export function answerLabel(item: StudyItem, side: Side): { label: string; sublabel?: string } {
  switch (side) {
    case "en":
      return { label: primaryMeaning(item) };
    case "romaji":
      if (item.category === "kanji") return kanjiReadingLabel(item);
      return { label: item.romaji[0] };
    case "jp":
      return { label: item.surface };
  }
}
