import { loadDictionaryFile } from "./client";
import { kanjiFile } from "./keys.mjs";
import type { KanjiDetails } from "./types";

const HAN = /\p{Script=Han}/u;
/** Marks written among kanji that aren't kanji themselves: 々 repeats the one before, 〆 is a sign. */
const MARKS = new Set(["々", "〆", "〇"]);

/** The different kanji in some text, in the order they appear. */
export function kanjiIn(text: string): string[] {
  return [...new Set([...text].filter((ch) => HAN.test(ch) && !MARKS.has(ch)))];
}

/**
 * Details of the given kanji from the dictionary's files (KANJIDIC2). A
 * kanji the files don't have is left out; so is one whose file can't be
 * reached, unless none could: then the lookup fails.
 */
export async function loadKanji(kanji: readonly string[]): Promise<Map<string, KanjiDetails>> {
  const paths = [...new Set(kanji.map(kanjiFile))];
  const files = await Promise.allSettled(paths.map((path) => loadDictionaryFile(path)));
  if (paths.length && files.every((file) => file.status === "rejected")) throw new Error("Kanji details can't be reached");
  const byPath = new Map(
    paths.map((path, i) => {
      const file = files[i];
      return [path, file.status === "fulfilled" ? (file.value as Record<string, KanjiDetails>) : {}];
    }),
  );
  const found = new Map<string, KanjiDetails>();
  for (const ch of kanji) {
    const details = byPath.get(kanjiFile(ch))?.[ch];
    if (details) found.set(ch, details);
  }
  return found;
}

/** What a kanji's grade says about it, in words. */
export function gradeLabel(grade: number): string {
  if (grade <= 6) return `Grade ${grade}`;
  return grade === 8 ? "Secondary school" : "Used in names";
}
