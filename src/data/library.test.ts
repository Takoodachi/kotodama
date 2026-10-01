import { isKana, toHiragana } from "wanakana";
import { describe, expect, it } from "vitest";
import { isWellFormedFurigana, toReading, toSurface } from "@/lib/furigana";
import { readingKey, stripPunctuation } from "@/lib/japanese";
import { ALL_GROUPS, SECTIONS } from "./groups";
import { EXAMPLES, exampleTarget, GAP, ITEMS_BY_CATEGORY, ITEMS_BY_GROUP, ITEMS_BY_ID, LIBRARY, writtenItem } from "./library";
import type { Category } from "./types";
import { wordSetLevel } from "./wordSets";

describe("content library", () => {
  it("has unique ids", () => {
    const ids = LIBRARY.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("puts every item in a group the picker knows about", () => {
    const known = new Set(ALL_GROUPS.map((g) => g.id));
    for (const item of LIBRARY) {
      for (const group of item.groups) expect(known, `${item.id} → ${group}`).toContain(group);
    }
  });

  it("has no empty groups in the picker, apart from sets that are fetched", () => {
    for (const group of ALL_GROUPS) {
      // JLPT word sets, and the further parts of the large kanji levels, come from the dictionary's files.
      const fetched = wordSetLevel(group.id) || /^kanji-[ng]\d-\d+$/.test(group.id);
      if (fetched) expect(ITEMS_BY_GROUP.has(group.id), group.id).toBe(false);
      else expect(ITEMS_BY_GROUP.get(group.id)?.length ?? 0, group.id).toBeGreaterThan(0);
    }
  });

  it("has unique group ids across sections", () => {
    const ids = SECTIONS.flatMap((s) => s.subsections.flatMap((sub) => sub.groups.map((g) => g.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses well-formed furigana markup", () => {
    for (const item of LIBRARY) expect(isWellFormedFurigana(item.jp), item.id).toBe(true);
  });

  it("has pure-kana readings", () => {
    for (const item of LIBRARY) {
      const reading = stripPunctuation(item.reading);
      expect(isKana(reading), `${item.id}: ${item.reading}`).toBe(true);
    }
  });

  it("gives every item at least one romaji and non-kana items a meaning", () => {
    for (const item of LIBRARY) {
      expect(item.romaji.length, item.id).toBeGreaterThan(0);
      if (item.category !== "hiragana" && item.category !== "katakana") {
        expect(item.meaning.length, item.id).toBeGreaterThan(0);
      }
    }
  });

  it("gives kanji a JLPT level, a grade and at least one reading", () => {
    for (const item of ITEMS_BY_CATEGORY.get("kanji")!) {
      expect(item.jlpt, item.id).toBeDefined();
      expect(item.grade, item.id).toBeDefined();
      expect((item.on?.length ?? 0) + (item.kun?.length ?? 0), item.id).toBeGreaterThan(0);
      expect([...item.surface].length, item.id).toBe(1);
    }
  });

  it("writes romaji that matches the kana reading (particles aside)", () => {
    // は, へ and を are pronounced wa, e and o as particles; fold them on both sides.
    const fold = (kana: string) => kana.replace(/は/g, "わ").replace(/へ/g, "え").replace(/を/g, "お");
    const key = (text: string) => readingKey(fold(toHiragana(text.toLowerCase())));
    for (const category of ["vocab", "phrase", "sentence", "grammar"] as Category[]) {
      for (const item of ITEMS_BY_CATEGORY.get(category)!) {
        expect(key(item.romaji[0]), `${item.id}: ${item.romaji[0]} vs ${item.reading}`).toBe(key(item.reading));
      }
    }
  });

  it("gives every word and kanji an example sentence that uses it", () => {
    for (const category of ["vocab", "kanji"] as Category[]) {
      for (const item of ITEMS_BY_CATEGORY.get(category)!) {
        const example = item.example;
        expect(example, `${item.id} has no example`).toBeDefined();
        expect(isWellFormedFurigana(example!.jp), `${item.id} markup`).toBe(true);
        expect(isKana(stripPunctuation(toReading(example!.jp))), `${item.id} reading`).toBe(true);
        expect(toSurface(example!.jp), `${item.id} uses ${exampleTarget(item)}`).toContain(exampleTarget(item));
        expect(example!.en.length, `${item.id} translation`).toBeGreaterThan(3);
      }
    }
  });

  it("gives every grammar item one gap, a kana answer, three wrong options and an explanation", () => {
    for (const item of ITEMS_BY_CATEGORY.get("grammar")!) {
      const where = item.id;
      expect(item.cloze!.split(GAP), where).toHaveLength(2);
      expect(isWellFormedFurigana(item.cloze!), where).toBe(true);
      expect(toSurface(item.cloze!.replace(GAP, item.answer!)), where).toBe(item.surface);
      const right = [item.answer!, ...(item.alsoRight ?? [])];
      for (const answer of right) expect(isKana(answer), `${where}: ${answer}`).toBe(true);
      const wrong = item.wrong ?? [];
      expect(new Set(wrong).size, `${where} wrong options`).toBeGreaterThanOrEqual(3);
      for (const w of wrong) expect(right, `${where}: ${w} is marked wrong and right`).not.toContain(w);
      expect(item.meaning.length, where).toBeGreaterThan(0);
      expect(item.note?.length ?? 0, `${where} note`).toBeGreaterThan(10);
    }
  });

  it("has no example sentences for ids that don't exist", () => {
    for (const id of Object.keys(EXAMPLES)) expect(ITEMS_BY_ID.has(id), id).toBe(true);
  });

  it("has enough distinct answers in each category for four options", () => {
    for (const [category, items] of ITEMS_BY_CATEGORY) {
      const labels = new Set(items.map((i) => (i.meaning[0] ?? i.romaji[0]).toLowerCase()));
      expect(labels.size, category).toBeGreaterThanOrEqual(4);
    }
  });

  it("has the expected amount of content", () => {
    const count = (c: Category) => ITEMS_BY_CATEGORY.get(c)!.length;
    // These are the items bundled with the app; the rest of the kanji and the JLPT words are fetched.
    // 46 main + 20 dakuten + 5 handakuten + 36 combinations; katakana adds 24 extended sounds.
    expect(count("hiragana")).toBe(107);
    expect(count("katakana")).toBe(131);
    const kanjiAt = (level: number) => ITEMS_BY_GROUP.get(`kanji-n${level}`)!.length;
    expect(kanjiAt(5)).toBeGreaterThanOrEqual(100);
    expect(kanjiAt(4)).toBeGreaterThanOrEqual(140);
    expect(kanjiAt(3)).toBeGreaterThanOrEqual(150);
    expect(kanjiAt(2)).toBeGreaterThanOrEqual(50);
    expect(kanjiAt(1)).toBeGreaterThanOrEqual(50);
    expect(count("vocab")).toBeGreaterThanOrEqual(1600);
    expect(count("phrase")).toBeGreaterThanOrEqual(300);
    expect(count("sentence")).toBeGreaterThanOrEqual(250);
    expect(count("grammar")).toBeGreaterThanOrEqual(120);
  });
});

describe("writtenItem", () => {
  const item = (id: string) => ITEMS_BY_ID.get(id)!;

  it("remembers the usual writing when the chosen scripts change a word", () => {
    const hito = writtenItem(item("v-hito"), ["katakana"]);
    expect(hito.surface).toBe("ヒト");
    expect(hito.usual).toBe("{人|ひと}");
    expect(writtenItem(item("p-ohayou"), ["katakana"]).usual).toBe("おはようございます");
    expect(writtenItem(item("v-koohii"), ["hiragana", "kanji"]).usual).toBe("コーヒー");
  });

  it("leaves the usual writing out when the word looks the same", () => {
    expect(writtenItem(item("v-koohii"), ["katakana"]).usual).toBeUndefined();
    expect(writtenItem(item("p-ohayou"), ["hiragana", "kanji"]).usual).toBeUndefined();
    expect(writtenItem(item("v-hito"), ["kanji", "hiragana", "katakana"]).usual).toBeUndefined();
  });
});
