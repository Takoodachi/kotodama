import sets from "./dictionary-sets.json";
import type { JlptLevel } from "./types";

/**
 * Word sets drawn from the dictionary: every JLPT level's word list, dealt
 * into parts of a couple of hundred words. Unlike the rest of the library
 * they aren't bundled with the app; a level's words are fetched when one of
 * its sets is chosen (see store/wordSets). The ids say which level a set or a
 * word belongs to, so what to fetch is known from the id alone.
 */
export const WORD_SETS = sets as { level: JlptLevel; parts: number }[];

/** `part` counts from 1. */
export const wordSetGroupId = (level: JlptLevel, part: number) => `dict-n${level}-${part}`;

/** The id of a dictionary word in a level's sets; `entry` is its JMdict entry number. */
export const wordSetItemId = (level: JlptLevel, entry: number) => `jm${level}-${entry}`;

/** The level whose words a group or item id belongs to, if it is from the dictionary's sets. */
export function wordSetLevel(id: string): JlptLevel | null {
  const match = /^(?:dict-n|jm)([1-5])-/.exec(id);
  return match ? (Number(match[1]) as JlptLevel) : null;
}

/** The levels needed for a selection of groups and a list of item ids, easiest first. */
export function wordSetLevels(ids: Iterable<string>): JlptLevel[] {
  const levels = new Set<JlptLevel>();
  for (const id of ids) {
    const level = wordSetLevel(id);
    if (level) levels.add(level);
  }
  return [...levels].sort((a, b) => b - a);
}
