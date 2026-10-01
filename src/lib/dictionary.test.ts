import { describe, expect, it } from "vitest";
import { addWordSet } from "@/data/library";
import { review, type SrsRecord } from "@/lib/srs";
import { dictionaryEntries, inDictionary, searchDictionary, unlockedEntries, unlockProgress } from "./dictionary";

const top = (query: string, n = 1) => searchDictionary(query).slice(0, n).map((item) => item.id);

describe("the dictionary", () => {
  it("holds every word, phrase and sentence, and nothing else", () => {
    expect(dictionaryEntries().every(inDictionary)).toBe(true);
    expect(new Set(dictionaryEntries().map((item) => item.category))).toEqual(new Set(["vocab", "phrase", "sentence"]));
  });

  it("lists everything in kana order when nothing is typed", () => {
    const all = searchDictionary("  ");
    expect(all).toHaveLength(dictionaryEntries().length);
    const firstA = all.findIndex((item) => item.reading.startsWith("あ"));
    const firstKa = all.findIndex((item) => item.reading.startsWith("か"));
    const firstWa = all.findIndex((item) => item.reading.startsWith("わ"));
    expect(firstA).toBeLessThan(firstKa);
    expect(firstKa).toBeLessThan(firstWa);
  });
});

describe("searchDictionary", () => {
  it("finds a word from English, putting an exact meaning first", () => {
    expect(top("eat")).toEqual(["v-taberu"]);
    expect(top("to eat")).toEqual(["v-taberu"]);
    expect(top("Coffee")).toEqual(["v-koohii"]);
    expect(top("teacher")).toEqual(["v-sensei"]);
  });

  it("finds a word from Japanese: kanji, kana or the other kana", () => {
    expect(top("食べる")).toEqual(["v-taberu"]);
    expect(top("たべる")).toEqual(["v-taberu"]);
    expect(top("タベル")).toEqual(["v-taberu"]);
    expect(top("こーひー")).toEqual(["v-koohii"]);
    expect(searchDictionary("食").map((item) => item.id)).toContain("v-taberu");
  });

  it("finds a word from romaji, however it's spelled", () => {
    expect(top("taberu")).toEqual(["v-taberu"]);
    expect(top("sensee")).toEqual(["v-sensei"]);
    expect(top("ohayou gozaimasu")).toEqual(["p-ohayou"]);
    expect(searchDictionary("watashi wa gakusei").map((item) => item.id)).toContain("s-desu-1");
  });

  it("puts words before the phrases and sentences that use them", () => {
    const results = searchDictionary("coffee");
    const firstSentence = results.findIndex((item) => item.category === "sentence");
    expect(results[0].category).toBe("vocab");
    expect(firstSentence).toBeGreaterThan(0);
  });

  it("returns nothing for nonsense", () => {
    expect(searchDictionary("qqqqzz")).toEqual([]);
    expect(searchDictionary("龘")).toEqual([]);
  });

  it("can be limited to some entries, such as the unlocked ones", () => {
    const only = new Set(["v-koohii"]);
    expect(searchDictionary("", (item) => only.has(item.id)).map((item) => item.id)).toEqual(["v-koohii"]);
    expect(searchDictionary("eat", (item) => only.has(item.id))).toEqual([]);
  });
});

describe("unlockedEntries", () => {
  const right = review(undefined, true, 1000);
  const wrong = review(undefined, false, 1000);

  it("counts entries answered right at least once", () => {
    const unlocked = unlockedEntries({ "v-taberu": right, "v-koohii": wrong, "p-ohayou": review(right, false, 2000) });
    expect([...unlocked].sort()).toEqual(["p-ohayou", "v-taberu"]);
  });

  it("leaves out kana, kanji and grammar, which aren't dictionary entries", () => {
    expect(unlockedEntries({ "h-あ": right, "k-日": right, "g-waga-1": right }).size).toBe(0);
  });

  it("counts records saved before unlocks were kept", () => {
    const old: SrsRecord = { box: 2, due: 0, seen: 3, correct: 2, lapses: 1, last: 500 };
    expect(unlockedEntries({ "v-taberu": old }).has("v-taberu")).toBe(true);
  });
});

describe("words from the dictionary's JLPT sets", () => {
  const right = review(undefined, true, 1000);

  it("count as unlocked even before their set is fetched, out of all there are to unlock", () => {
    const own = dictionaryEntries().length;
    const before = unlockProgress({ "jm1-1421150": right, "v-taberu": right, "h-あ": right }, 6000);
    expect(before).toEqual({ unlocked: 2, total: own + 6000 });
  });

  it("join the dictionary once their set is added to the library", () => {
    const own = dictionaryEntries().length;
    expect(searchDictionary("landowner")).toEqual([]);
    addWordSet({ level: 1, groups: [[[1421150, "{地主|じぬし}", ["landowner", "landlord"], "noun"], "v-taberu"]] });
    expect(dictionaryEntries()).toHaveLength(own + 1);
    expect(top("landowner")).toEqual(["jm1-1421150"]);
    expect(top("じぬし")).toEqual(["jm1-1421150"]);
    expect([...unlockedEntries({ "jm1-1421150": right })]).toEqual(["jm1-1421150"]);
  });
});
