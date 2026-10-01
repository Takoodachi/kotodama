import { describe, expect, it } from "vitest";
import { checkMeaning, checkReading } from "@/lib/quiz/check";
import { GROUPS_BY_ID } from "./groups";
import {
  addWordSet,
  countForGroups,
  ITEMS_BY_CATEGORY,
  ITEMS_BY_GROUP,
  ITEMS_BY_ID,
  itemsForGroups,
  libraryRevision,
} from "./library";
import { WORD_SETS, wordSetGroupId, wordSetItemId, wordSetLevel, wordSetLevels } from "./wordSets";

describe("word set ids", () => {
  it("say which level a set or a word belongs to", () => {
    expect(wordSetGroupId(5, 1)).toBe("dict-n5-1");
    expect(wordSetItemId(3, 1358280)).toBe("jm3-1358280");
    expect(wordSetLevel("dict-n5-1")).toBe(5);
    expect(wordSetLevel("jm3-1358280")).toBe(3);
    expect(wordSetLevel("v-taberu")).toBeNull();
    expect(wordSetLevel("kanji-n5")).toBeNull();
  });

  it("give the levels a selection and a list of items need, easiest first", () => {
    expect(wordSetLevels(["hira-a", "dict-n3-2", "jm5-1", "dict-n3-1", "v-taberu"])).toEqual([5, 3]);
    expect(wordSetLevels([])).toEqual([]);
  });

  it("have a chip in the picker for every part of every level", () => {
    for (const { level, parts } of WORD_SETS) {
      for (let part = 1; part <= parts; part++) expect(GROUPS_BY_ID.has(wordSetGroupId(level, part))).toBe(true);
      expect(GROUPS_BY_ID.has(wordSetGroupId(level, parts + 1))).toBe(false);
    }
  });
});

describe("addWordSet", () => {
  const sizes = { "dict-n5-1": 3, "dict-n5-2": 1 };

  it("counts a set by its known size until its words are fetched", () => {
    expect(countForGroups(["dict-n5-1", "dict-n5-2"])).toBe(0);
    expect(countForGroups(["dict-n5-1", "dict-n5-2"], sizes)).toBe(4);
  });

  it("adds the level's words to the library, in their sets", () => {
    const words = ITEMS_BY_CATEGORY.get("vocab")!.length;
    const before = libraryRevision();
    const added = addWordSet({
      level: 5,
      groups: [
        ["v-taberu", [1318400, "{自動車|じどうしゃ}", ["car", "automobile"], "noun"], "v-gone-from-the-app"],
        [[1412890, "{大|おお}きな", ["big", "large"]]],
      ],
    });
    expect(added).toBe(true);
    expect(libraryRevision()).toBe(before + 1);
    expect(ITEMS_BY_CATEGORY.get("vocab")).toHaveLength(words + 2);
    expect(ITEMS_BY_GROUP.get("dict-n5-1")!.map((item) => item.id)).toEqual(["v-taberu", "jm5-1318400"]);
    expect(ITEMS_BY_GROUP.get("dict-n5-2")!.map((item) => item.id)).toEqual(["jm5-1412890"]);
    // Once fetched, the real count is used, whatever the size said.
    expect(countForGroups(["dict-n5-1", "dict-n5-2"], sizes)).toBe(3);
  });

  it("makes a full study item of a dictionary word", () => {
    const car = ITEMS_BY_ID.get("jm5-1318400")!;
    expect(car).toMatchObject({
      category: "vocab",
      groups: ["dict-n5-1"],
      surface: "自動車",
      reading: "じどうしゃ",
      romaji: ["jidousha"],
      meaning: ["car", "automobile"],
      pos: "noun",
    });
    expect(checkReading(car, "jidōsha")).toBe(true);
    expect(checkMeaning(car, "automobile")).toBe(true);
  });

  it("puts a word the library already teaches in the set as it is, not a second time", () => {
    const eat = ITEMS_BY_ID.get("v-taberu")!;
    expect(eat.groups).toContain("dict-n5-1");
    expect(eat.groups[0]).not.toBe("dict-n5-1");
    expect(eat.example).toBeDefined();
    expect(itemsForGroups(["dict-n5-1", eat.groups[0]]).filter((item) => item.id === "v-taberu")).toHaveLength(1);
  });

  it("adds a level only once", () => {
    const before = libraryRevision();
    expect(addWordSet({ level: 5, groups: [[[1, "あ", ["x"]]]] })).toBe(false);
    expect(libraryRevision()).toBe(before);
    expect(ITEMS_BY_ID.has("jm5-1")).toBe(false);
  });
});
