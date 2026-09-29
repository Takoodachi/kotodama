import { isKana, toHiragana } from "wanakana";
import { describe, expect, it } from "vitest";
import { isWellFormedFurigana, toReading, toSurface } from "@/lib/furigana";
import { readingKey, stripPunctuation } from "@/lib/japanese";
import { ALL_GROUPS, SECTIONS } from "./groups";
import { EXAMPLES, exampleTarget, ITEMS_BY_CATEGORY, ITEMS_BY_GROUP, ITEMS_BY_ID, LIBRARY } from "./library";
import type { Category } from "./types";

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

  it("has no empty groups in the picker", () => {
    for (const group of ALL_GROUPS) {
      expect(ITEMS_BY_GROUP.get(group.id)?.length ?? 0, group.id).toBeGreaterThan(0);
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
    for (const category of ["vocab", "phrase", "sentence"] as Category[]) {
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
    // 46 main + 20 dakuten + 5 handakuten + 36 combinations; katakana adds 24 extended sounds.
    expect(count("hiragana")).toBe(107);
    expect(count("katakana")).toBe(131);
    const kanjiAt = (level: number) => ITEMS_BY_GROUP.get(`kanji-n${level}`)!.length;
    expect(kanjiAt(5)).toBeGreaterThanOrEqual(100);
    expect(kanjiAt(4)).toBeGreaterThanOrEqual(140);
    expect(kanjiAt(3)).toBeGreaterThanOrEqual(160);
    expect(kanjiAt(2)).toBeGreaterThanOrEqual(55);
    expect(kanjiAt(1)).toBeGreaterThanOrEqual(50);
    expect(count("vocab")).toBeGreaterThanOrEqual(470);
    expect(count("phrase")).toBeGreaterThanOrEqual(120);
    expect(count("sentence")).toBeGreaterThanOrEqual(95);
  });
});
