import { describe, expect, it } from "vitest";
import { checkMeaning, checkReading } from "@/lib/quiz/check";
import { GROUPS_BY_ID, SECTIONS } from "./groups";
import { KANJI_SETS, kanjiGroupIds, kanjiSetOf } from "./kanjiSets";
import {
  addKanjiSet,
  countForGroups,
  hasSet,
  isPending,
  ITEMS_BY_CATEGORY,
  ITEMS_BY_GROUP,
  ITEMS_BY_ID,
  libraryRevision,
} from "./library";

describe("kanji set ids", () => {
  it("keep a level's plain id for its first part, and number the rest", () => {
    expect(kanjiGroupIds("n", 5, 1)).toEqual(["kanji-n5"]);
    expect(kanjiGroupIds("n", 1, 3)).toEqual(["kanji-n1", "kanji-n1-2", "kanji-n1-3"]);
    expect(kanjiGroupIds("g", 8, 2)).toEqual(["kanji-g8", "kanji-g8-2"]);
  });

  it("say which level or grade a set is of", () => {
    expect(kanjiSetOf("kanji-n3")).toEqual({ jlpt: 3 });
    expect(kanjiSetOf("kanji-n1-4")).toEqual({ jlpt: 1 });
    expect(kanjiSetOf("kanji-g8-2")).toEqual({ grade: 8 });
    expect(kanjiSetOf("vocab-food")).toEqual({});
  });

  it("have a chip in the picker for every part, the first under the id the app's own kanji use", () => {
    const kanji = SECTIONS.find((section) => section.id === "kanji")!;
    const chips = (variant: "jlpt" | "grade") => kanji.subsections.find((sub) => sub.variant === variant)!.groups;
    expect(chips("jlpt").map((g) => g.id)).toEqual(KANJI_SETS.jlpt.flatMap((s) => kanjiGroupIds("n", s.level, s.parts)));
    expect(chips("grade").map((g) => g.id)).toEqual(KANJI_SETS.grade.flatMap((s) => kanjiGroupIds("g", s.grade, s.parts)));
    expect(GROUPS_BY_ID.get("kanji-n5")).toMatchObject({ label: "N5", sublabel: "Beginner" });
    expect(GROUPS_BY_ID.get("kanji-n1-2")).toMatchObject({ label: "N1·2", sublabel: "Advanced, part 2" });
    // Every kanji the app carries is in a first part.
    for (const item of ITEMS_BY_CATEGORY.get("kanji")!) {
      expect(item.groups, item.id).toEqual([`kanji-n${item.jlpt}`, `kanji-g${item.grade}`]);
      for (const group of item.groups) expect(GROUPS_BY_ID.has(group), `${item.id} → ${group}`).toBe(true);
    }
  });
});

describe("addKanjiSet", () => {
  const own = ITEMS_BY_GROUP.get("kanji-n5")!.map((item) => item.surface).join("");
  const sizes = { "kanji-n5": own.length, "kanji-n1": 3, "kanji-n1-2": 1, "kanji-g8": 4 };

  it("counts a kanji set in full, by its known size, until the kanji arrive", () => {
    expect(isPending("kanji-n1")).toBe(true);
    expect(isPending("hira-a")).toBe(false);
    const carried = ITEMS_BY_GROUP.get("kanji-n1")!.length;
    expect(countForGroups(["kanji-n1", "kanji-n1-2"])).toBe(carried);
    expect(countForGroups(["kanji-n1", "kanji-n1-2"], sizes)).toBe(4);
    expect(countForGroups(["kanji-n1", "hira-a"], sizes)).toBe(3 + ITEMS_BY_GROUP.get("hira-a")!.length);
  });

  it("adds the kanji the app doesn't carry, and files every kanji under its sets", () => {
    const kanji = ITEMS_BY_CATEGORY.get("kanji")!.length;
    const before = libraryRevision();
    expect(ITEMS_BY_ID.has("k-締")).toBe(true);
    const added = addKanjiSet({
      items: [
        ["麓", ["ロク"], ["ふもと"], ["foot of a mountain"]],
        ["𠮟", ["シツ", "シチ"], ["しか.る"], ["scold", "reprove"]],
        ["璽", ["ジ"], [], ["emperor's seal"]],
      ],
      groups: {
        "kanji-n5": own,
        "kanji-n1": "締麓𠮟",
        "kanji-n1-2": "璽",
        "kanji-g8": "締麓𠮟璽",
      },
    });
    expect(added).toBe(true);
    expect(hasSet("kanji")).toBe(true);
    expect(isPending("kanji-n1")).toBe(false);
    expect(libraryRevision()).toBe(before + 1);
    expect(ITEMS_BY_CATEGORY.get("kanji")).toHaveLength(kanji + 3);
    expect(ITEMS_BY_GROUP.get("kanji-n1")!.map((item) => item.id)).toEqual(["k-締", "k-麓", "k-𠮟"]);
    expect(ITEMS_BY_GROUP.get("kanji-n1-2")!.map((item) => item.id)).toEqual(["k-璽"]);
    expect(ITEMS_BY_GROUP.get("kanji-n5")!.map((item) => item.surface).join("")).toBe(own);
    expect(countForGroups(["kanji-n1", "kanji-n1-2"], sizes)).toBe(4);
  });

  it("makes a full study item of a fetched kanji", () => {
    const scold = ITEMS_BY_ID.get("k-𠮟")!;
    expect(scold).toMatchObject({
      category: "kanji",
      groups: ["kanji-n1", "kanji-g8"],
      surface: "𠮟",
      reading: "しかる",
      meaning: ["scold", "reprove"],
      jlpt: 1,
      grade: 8,
    });
    expect(checkReading(scold, "shikaru")).toBe(true);
    expect(checkReading(scold, "shitsu")).toBe(true);
    expect(checkMeaning(scold, "to scold")).toBe(true);
  });

  it("leaves the app's own kanji as they are, in the sets the file names", () => {
    const tighten = ITEMS_BY_ID.get("k-締")!;
    expect(tighten.groups).toEqual(["kanji-n1", "kanji-g8"]);
    expect(tighten.example).toBeDefined();
  });

  it("is added only once", () => {
    const before = libraryRevision();
    expect(addKanjiSet({ items: [["亜", ["ア"], [], ["Asia"]]], groups: { "kanji-n1": "亜" } })).toBe(false);
    expect(libraryRevision()).toBe(before);
    expect(ITEMS_BY_ID.has("k-亜")).toBe(false);
  });
});
