// @ts-check
import { kanjiFile, kanjiGroupId } from "../../src/lib/jmdict/keys.mjs";

/**
 * Turns KANJIDIC2 into two things, both written under the dictionary's folder
 * by ./build.mjs:
 *
 *   kd/<n>.json      details of every kanji, for the dictionary: readings,
 *                    meanings, strokes, grade, JLPT level, how common it is
 *   sets/kanji.json  the jōyō kanji (the 2,136 in everyday use) for the quiz,
 *                    by JLPT level and by school grade
 *
 * The app carries a few hundred kanji of its own, with hand-picked meanings
 * and example sentences. Those stay as they are: the set file only says
 * which set each belongs to, and adds the kanji the app doesn't have.
 *
 * JLPT levels. KANJIDIC2 has the four levels of the test before 2010. Its
 * level 4 is N5, level 3 is N4 and level 1 is N1, as is every jōyō kanji
 * without a level (those added to the list in 2010). Level 2 was split into
 * N3 and N2, and no official list says how: the more common half, by
 * KANJIDIC2's newspaper frequency, is taken as N3. The app's own kanji keep
 * the level they have.
 */

/**
 * @typedef {{
 *   literal: string,
 *   misc: { grade?: number | null, strokeCounts: number[], frequency?: number | null, jlptLevel?: number | null },
 *   readingMeaning?: {
 *     groups: { readings: { type: string, value: string }[], meanings: { lang: string, value: string }[] }[],
 *   } | null,
 * }} Character
 * @typedef {{ literal: string, jlpt: number, grade: number }} CuratedKanji
 * @typedef {{ jlpt: { level: number, parts: number }[], grade: { grade: number, parts: number }[] }} KanjiConfig
 * @typedef {{ o?: string[], k?: string[], m?: string[], s?: number, g?: number, j?: number, f?: number }} KanjiDetails
 */

/** Meanings given to a quiz card: the first few say what the kanji is about. */
const QUIZ_MEANINGS = 4;

/** @param {Character} character */
function read(character) {
  const groups = character.readingMeaning?.groups ?? [];
  /** @param {string} type */
  const readings = (type) => groups.flatMap((g) => g.readings.filter((r) => r.type === type).map((r) => r.value));
  const meanings = groups.flatMap((g) => g.meanings.filter((m) => m.lang === "en").map((m) => m.value));
  return { on: readings("ja_on"), kun: readings("ja_kun"), meanings };
}

/** Jōyō kanji have a school grade: 1 to 6, or 8 for those taught in secondary school. */
/** @param {Character} character */
const isJouyou = (character) => !!character.misc.grade && character.misc.grade <= 8;

/**
 * @param {Character[]} characters
 * @param {CuratedKanji[]} curatedKanji
 * @param {KanjiConfig} config
 */
export function buildKanji(characters, curatedKanji, config) {
  const curated = new Map(curatedKanji.map((k) => [k.literal, k]));
  const order = new Map(curatedKanji.map((k, i) => [k.literal, i]));
  const jouyou = characters.filter(isJouyou);
  /** @param {Character} c */
  const frequency = (c) => c.misc.frequency ?? Infinity;
  /** Common kanji first; those without a frequency in the order of their code points. */
  const byFrequency = (/** @type {Character} */ a, /** @type {Character} */ b) =>
    frequency(a) - frequency(b) || (a.literal.codePointAt(0) ?? 0) - (b.literal.codePointAt(0) ?? 0);

  // ---- JLPT levels (see the note at the top).
  /** @type {Map<string, number>} */
  const level = new Map();
  const oldLevel2 = jouyou.filter((c) => c.misc.jlptLevel === 2);
  const asN3 = oldLevel2.filter((c) => curated.get(c.literal)?.jlpt === 3).length;
  let left = Math.round(oldLevel2.length / 2) - asN3;
  for (const c of [...jouyou].sort(byFrequency)) {
    const own = curated.get(c.literal);
    if (own) level.set(c.literal, own.jlpt);
    else if (c.misc.jlptLevel === 4) level.set(c.literal, 5);
    else if (c.misc.jlptLevel === 3) level.set(c.literal, 4);
    else if (c.misc.jlptLevel === 2) level.set(c.literal, left-- > 0 ? 3 : 2);
    else level.set(c.literal, 1);
  }
  /** @param {Character} c */
  const gradeOf = (c) => curated.get(c.literal)?.grade ?? /** @type {number} */ (c.misc.grade);

  // ---- The sets: each level and grade dealt into parts, the app's own kanji first, then by how common.
  const inSet = (/** @type {Character} */ a, /** @type {Character} */ b) => {
    const [ia, ib] = [order.get(a.literal), order.get(b.literal)];
    if (ia !== undefined || ib !== undefined) return (ia ?? Infinity) - (ib ?? Infinity);
    return byFrequency(a, b);
  };
  /** @type {Record<string, string>} */
  const groups = {};
  /** @type {Record<string, number>} */
  const sizes = {};
  /**
   * @param {"n" | "g"} kind
   * @param {number} key
   * @param {number} parts
   * @param {Character[]} members
   */
  const deal = (kind, key, parts, members) => {
    const sorted = [...members].sort(inSet);
    for (let part = 0; part < parts; part++) {
      const slice = sorted.slice(Math.round((sorted.length * part) / parts), Math.round((sorted.length * (part + 1)) / parts));
      const id = kanjiGroupId(kind, key, part + 1);
      groups[id] = slice.map((c) => c.literal).join("");
      sizes[id] = slice.length;
    }
  };
  for (const { level: l, parts } of config.jlpt) deal("n", l, parts, jouyou.filter((c) => level.get(c.literal) === l));
  for (const { grade, parts } of config.grade) deal("g", grade, parts, jouyou.filter((c) => gradeOf(c) === grade));

  // The kanji the app doesn't carry: [kanji, on'yomi, kun'yomi, meanings].
  const items = jouyou
    .filter((c) => !curated.has(c.literal))
    .map((c) => {
      const { on, kun, meanings } = read(c);
      // "one radical (no.1)" names the radical, which isn't a meaning to learn.
      const plain = meanings.filter((m) => !/radical/i.test(m));
      return [c.literal, on, kun, (plain.length ? plain : meanings).slice(0, QUIZ_MEANINGS)];
    });

  // ---- Details of every kanji, in files named after their code points.
  /** @type {Map<string, Record<string, KanjiDetails>>} */
  const files = new Map();
  for (const c of characters) {
    const { on, kun, meanings } = read(c);
    /** @type {KanjiDetails} */
    const details = {};
    if (on.length) details.o = on;
    if (kun.length) details.k = kun;
    if (meanings.length) details.m = meanings;
    if (c.misc.strokeCounts.length) details.s = c.misc.strokeCounts[0];
    if (c.misc.grade) details.g = isJouyou(c) ? gradeOf(c) : c.misc.grade;
    if (level.has(c.literal)) details.j = level.get(c.literal);
    if (c.misc.frequency) details.f = c.misc.frequency;
    const path = kanjiFile(c.literal);
    const file = files.get(path);
    if (file) file[c.literal] = details;
    else files.set(path, { [c.literal]: details });
  }

  return { files, set: { items, groups }, sizes, count: characters.length, jouyou: jouyou.length };
}
