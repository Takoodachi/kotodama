import type { CustomItem } from "@/lib/customQuiz";
import type { PartOfSpeech } from "@/data/types";

/**
 * The learner's own quiz as it is saved to an account, inside the progress
 * document (see ./progressDoc). Every change carries the time it was made,
 * and of two devices' word on the same thing the later one stands: a word
 * taken out on the phone after it was added on the laptop stays out. Nothing
 * is ever dropped from the document, only marked as taken out or deleted, so
 * devices can sync in any order, however long they were apart.
 */
export interface OwnDoc {
  /** Item id → when it was last put in the quiz (`in`) or taken out of it. */
  quiz: Record<string, { at: number; in: boolean }>;
  /**
   * The items the library doesn't carry (entries the learner wrote, dictionary
   * words outside every set), by id: when each was last written, and the item,
   * or null once deleted.
   */
  items: Record<string, { at: number; item: CustomItem | null }>;
}

export const emptyOwn = (): OwnDoc => ({ quiz: {}, items: {} });

/** The ids in the quiz, in the order they were added. */
export function quizOf(doc: OwnDoc): string[] {
  return Object.entries(doc.quiz)
    .filter(([, entry]) => entry.in)
    .sort(([a, x], [b, y]) => x.at - y.at || (a < b ? -1 : a > b ? 1 : 0))
    .map(([id]) => id);
}

/** The items kept with the quiz, oldest first. */
export function itemsOf(doc: OwnDoc): CustomItem[] {
  return Object.values(doc.items)
    .filter((entry): entry is { at: number; item: CustomItem } => entry.item !== null)
    .sort((x, y) => x.at - y.at || (x.item.id < y.item.id ? -1 : 1))
    .map((entry) => entry.item);
}

let lastStamp = 0;

/**
 * A time for a change made now. It is always after the change it replaces,
 * whatever the clock says, and after the last one given out, so two things
 * added in the same instant keep their order.
 */
export function stamp(before?: { at: number }): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1, (before?.at ?? 0) + 1);
  return lastStamp;
}

/** The later of two; made at the same moment, the same one whichever way round they come. */
function later<T extends { at: number }>(a: T | undefined, b: T): T {
  if (!a) return b;
  if (a.at !== b.at) return a.at > b.at ? a : b;
  return JSON.stringify(a) <= JSON.stringify(b) ? a : b;
}

function mergeEntries<T extends { at: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const merged = { ...a };
  for (const [id, entry] of Object.entries(b)) merged[id] = later(merged[id], entry);
  return merged;
}

/** Combines two versions of the quiz. Order doesn't matter, and merging twice changes nothing. */
export function mergeOwn(a: OwnDoc, b: OwnDoc): OwnDoc {
  return { quiz: mergeEntries(a.quiz, b.quiz), items: mergeEntries(a.items, b.items) };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const time = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);

const strings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((text) => typeof text === "string") ? value : null;

const KINDS = new Set(["vocab", "phrase", "sentence"]);
const CLASSES = new Set(["noun", "pronoun", "verb", "i-adj", "na-adj", "adverb", "expression", "counter"]);

function readItem(id: string, value: unknown): CustomItem | null {
  if (!isObject(value) || typeof value.jp !== "string" || !value.jp) return null;
  const meaning = strings(value.meaning);
  if (typeof value.category !== "string" || !KINDS.has(value.category) || !meaning?.length) return null;
  const romaji = strings(value.romaji);
  return {
    id,
    category: value.category as CustomItem["category"],
    jp: value.jp,
    meaning,
    ...(romaji?.length && { romaji }),
    ...(typeof value.pos === "string" && CLASSES.has(value.pos) && { pos: value.pos as PartOfSpeech }),
    ...(value.saidParticles === true && { saidParticles: true }),
  };
}

/** Reads the quiz from the cloud (or from this device) defensively: anything malformed is dropped. */
export function readOwn(value: unknown): OwnDoc {
  const doc = emptyOwn();
  if (!isObject(value)) return doc;
  if (isObject(value.quiz)) {
    for (const [id, entry] of Object.entries(value.quiz)) {
      if (isObject(entry) && time(entry.at)) doc.quiz[id] = { at: time(entry.at), in: entry.in === true };
    }
  }
  if (isObject(value.items)) {
    for (const [id, entry] of Object.entries(value.items)) {
      if (!isObject(entry) || !time(entry.at)) continue;
      const item = entry.item === null ? null : readItem(id, entry.item);
      // An item that can't be read is left out rather than taken for deleted.
      if (entry.item === null || item) doc.items[id] = { at: time(entry.at), item };
    }
  }
  return doc;
}
