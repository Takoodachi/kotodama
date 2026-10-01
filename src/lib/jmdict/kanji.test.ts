import { describe, expect, it } from "vitest";
import { buildKanji } from "../../../scripts/dictionary/kanji.mjs";
import { gradeLabel, kanjiIn } from "./kanji";
import { kanjiFile, kanjiGroupId } from "./keys.mjs";

/** A character in KANJIDIC2's shape. `old` is its level in the JLPT before 2010. */
const character = (
  literal: string,
  misc: { grade?: number; old?: number; frequency?: number; strokes?: number },
  on: string[] = ["カ"],
  kun: string[] = [],
  meanings: string[] = [`meaning of ${literal}`],
) => ({
  literal,
  misc: { grade: misc.grade, strokeCounts: [misc.strokes ?? 8], frequency: misc.frequency, jlptLevel: misc.old },
  readingMeaning: {
    groups: [
      {
        readings: [
          { type: "pinyin", value: "x" },
          ...on.map((value) => ({ type: "ja_on", value })),
          ...kun.map((value) => ({ type: "ja_kun", value })),
        ],
        meanings: [{ lang: "fr", value: "sens" }, ...meanings.map((value) => ({ lang: "en", value }))],
      },
    ],
  },
});

describe("kanjiIn", () => {
  it("picks out the different kanji of a word, in order", () => {
    expect(kanjiIn("食べ物")).toEqual(["食", "物"]);
    expect(kanjiIn("日々の日")).toEqual(["日"]);
    expect(kanjiIn("コーヒー taberu たべる")).toEqual([]);
    expect(kanjiIn("𠮟る")).toEqual(["𠮟"]);
  });

  it("names a grade", () => {
    expect(gradeLabel(2)).toBe("Grade 2");
    expect(gradeLabel(8)).toBe("Secondary school");
    expect(gradeLabel(9)).toBe("Used in names");
  });
});

describe("kanji from KANJIDIC2", () => {
  const CHARACTERS = [
    character("一", { grade: 1, old: 4, frequency: 2, strokes: 1 }, ["イチ"], ["ひと.つ"], ["one", "one radical (no.1)"]),
    character("食", { grade: 2, old: 4, frequency: 328, strokes: 9 }, ["ショク"], ["た.べる"], ["eat", "food"]),
    character("乗", { grade: 3, old: 3, frequency: 377 }),
    // Four of the old level 2, which is split in two by how common they are.
    character("政", { grade: 5, old: 2, frequency: 17 }),
    character("疲", { grade: 8, old: 2, frequency: 1574 }),
    character("偉", { grade: 8, old: 2, frequency: 1639 }),
    character("券", { grade: 5, old: 2, frequency: 884 }),
    character("締", { grade: 8, old: 1, frequency: 1140 }),
    character("挨", { grade: 8 }),
    character("鬱", { grade: 8 }, ["ウツ"], [], ["gloom", "depression", "melancholy", "luxuriant", "dense"]),
    // Not jōyō: a kanji for names, and one with no grade at all.
    character("凛", { grade: 9, old: 1 }),
    character("龘", {}, [], [], []),
  ];
  // The app's own kanji keep the level and grade the app gives them.
  const CURATED = [
    { literal: "食", jlpt: 5, grade: 2 },
    { literal: "偉", jlpt: 3, grade: 8 },
    { literal: "締", jlpt: 1, grade: 8 },
  ];
  const CONFIG = {
    jlpt: [
      { level: 5, parts: 1 },
      { level: 4, parts: 1 },
      { level: 3, parts: 1 },
      { level: 2, parts: 1 },
      { level: 1, parts: 2 },
    ],
    grade: [
      { grade: 1, parts: 1 },
      { grade: 2, parts: 1 },
      { grade: 3, parts: 1 },
      { grade: 5, parts: 1 },
      { grade: 8, parts: 2 },
    ],
  };
  const built = buildKanji(CHARACTERS, CURATED, CONFIG);

  it("names sets and files the way the app does", () => {
    expect(kanjiGroupId("n", 3, 1)).toBe("kanji-n3");
    expect(kanjiGroupId("g", 8, 2)).toBe("kanji-g8-2");
    expect(kanjiFile("食")).toBe("kd/131.json");
    expect(kanjiFile("飮")).toBe("kd/131.json");
    expect(kanjiFile("一")).toBe("kd/9c.json");
  });

  it("gives every jōyō kanji a JLPT level from its old one", () => {
    const { groups } = built.set;
    expect(groups["kanji-n5"]).toBe("食一");
    expect(groups["kanji-n4"]).toBe("乗");
    // 偉 is N3 because the app says so; of the other three, the most common one fills the N3 half.
    expect(groups["kanji-n3"]).toBe("偉政");
    expect(groups["kanji-n2"]).toBe("券疲");
    // The old level 1, and jōyō kanji without an old level; names' kanji are left out.
    expect(groups["kanji-n1"] + groups["kanji-n1-2"]).toBe("締挨鬱");
    expect(built.jouyou).toBe(10);
  });

  it("deals a level or grade into parts, the app's own kanji first, then the most common", () => {
    expect(built.set.groups["kanji-g8"]).toBe("偉締疲");
    expect(built.set.groups["kanji-g8-2"]).toBe("挨鬱");
    expect(built.sizes).toMatchObject({ "kanji-n5": 2, "kanji-n1": 2, "kanji-n1-2": 1, "kanji-g8": 3, "kanji-g8-2": 2 });
  });

  it("lists the kanji the app doesn't carry, with readings and a few meanings", () => {
    const items = new Map(built.set.items.map((item) => [item[0], item]));
    expect([...items.keys()].sort()).toEqual(["一", "乗", "券", "挨", "政", "疲", "鬱"].sort());
    expect(items.get("一")).toEqual(["一", ["イチ"], ["ひと.つ"], ["one"]]);
    expect(items.get("鬱")![3]).toEqual(["gloom", "depression", "melancholy", "luxuriant"]);
  });

  it("keeps details of every kanji, jōyō or not, in files by code point", () => {
    expect(built.count).toBe(CHARACTERS.length);
    const file = built.files.get(kanjiFile("食"))!;
    expect(file["食"]).toEqual({ o: ["ショク"], k: ["た.べる"], m: ["eat", "food"], s: 9, g: 2, j: 5, f: 328 });
    expect(built.files.get(kanjiFile("一"))!["一"].m).toEqual(["one", "one radical (no.1)"]);
    expect(built.files.get(kanjiFile("偉"))!["偉"]).toMatchObject({ g: 8, j: 3 });
    // A name kanji has its grade but no JLPT level; a rare one may have nothing but its strokes.
    expect(built.files.get(kanjiFile("凛"))!["凛"]).toEqual({ o: ["カ"], m: ["meaning of 凛"], s: 8, g: 9 });
    expect(built.files.get(kanjiFile("龘"))!["龘"]).toEqual({ s: 8 });
  });
});
