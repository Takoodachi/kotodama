import { kanjiGroupId } from "@/lib/jmdict/keys.mjs";
import config from "./kanji-sets.json";
import type { JlptLevel } from "./types";

/**
 * The kanji sets: all 2,136 jōyō kanji, by JLPT level and by school grade.
 * The app carries a few hundred kanji itself (kanji.json, with their example
 * sentences); the rest come from KANJIDIC2 and are fetched the first time a
 * kanji set is chosen (see store/fetchedSets). Large levels are dealt into
 * parts of under two hundred, the app's own kanji first and then the most
 * common, so the first part's id is the one the whole level had before.
 */
export const KANJI_SETS = config as {
  jlpt: { level: JlptLevel; parts: number }[];
  /** School grades 1 to 6, and 8 for the kanji taught in secondary school. */
  grade: { grade: number; parts: number }[];
};

/** The ids of a level's or grade's sets, in order. */
export const kanjiGroupIds = (kind: "n" | "g", key: number, parts: number) =>
  Array.from({ length: parts }, (_, i) => kanjiGroupId(kind, key, i + 1));

/** The JLPT level and school grade a kanji set id stands for. */
export function kanjiSetOf(groupId: string): { jlpt?: JlptLevel; grade?: number } {
  const match = /^kanji-([ng])(\d)(?:-\d+)?$/.exec(groupId);
  if (!match) return {};
  return match[1] === "n" ? { jlpt: Number(match[2]) as JlptLevel } : { grade: Number(match[2]) };
}
