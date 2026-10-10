import { afterEach, describe, expect, it } from "vitest";
import { ITEMS_BY_CATEGORY, ITEMS_BY_GROUP, ITEMS_BY_ID, CUSTOM_GROUP, LIBRARY, libraryRevision, setCustomItems } from "@/data/library";
import { searchDictionary } from "@/lib/dictionary";
import { toReading, toSurface } from "@/lib/furigana";
import type { JmEntry } from "@/lib/jmdict/types";
import { checkMeaning, checkReading } from "@/lib/quiz/check";
import {
  dictionaryWordId,
  draftFrom,
  entryItem,
  guessKind,
  isOwnId,
  needsReading,
  ownItem,
  ownMarkup,
  romajiToKana,
  type CustomItem,
  type OwnDraft,
} from "./customQuiz";

const draft = (fields: Partial<OwnDraft>): OwnDraft => ({ kind: "vocab", japanese: "", reading: "", meaning: "", ...fields });

/** The entry a form makes, which must be one. */
function made(fields: Partial<OwnDraft>, id = "own-test"): CustomItem {
  const item = ownItem(draft(fields), id);
  if ("field" in item) throw new Error(`${item.field}: ${item.message}`);
  return item;
}

afterEach(() => {
  setCustomItems([]);
});

describe("romajiToKana", () => {
  it("turns romaji into kana, and nothing else", () => {
    expect(romajiToKana("taberu")).toBe("たべる");
    expect(romajiToKana("Watashi wa gakusei desu.")).toBe("わたしわがくせいです");
    expect(romajiToKana("ko-hi-")).toBe("こーひー");
    expect(romajiToKana("eat")).toBeNull();
    expect(romajiToKana("食べる")).toBeNull();
    expect(romajiToKana("")).toBeNull();
  });
});

describe("needsReading", () => {
  it("is for anything kana alone doesn't spell out", () => {
    expect(needsReading("たべる")).toBe(false);
    expect(needsReading("コーヒー、おねがいします。")).toBe(false);
    expect(needsReading("食べる")).toBe(true);
    expect(needsReading("Tシャツ")).toBe(true);
  });
});

describe("guessKind", () => {
  it("goes by length and by how the text ends", () => {
    expect(guessKind("食べる")).toBe("vocab");
    expect(guessKind("アイスクリーム")).toBe("vocab");
    expect(guessKind("よろしくおねがいします")).toBe("phrase");
    expect(guessKind("わたしはがくせいです。")).toBe("sentence");
    expect(guessKind("taberu")).toBe("vocab");
    expect(guessKind("ohayou gozaimasu")).toBe("phrase");
    expect(guessKind("watashi wa gakusei desu")).toBe("sentence");
  });
});

describe("draftFrom", () => {
  it("takes Japanese for the writing", () => {
    expect(draftFrom(" 食べる ")).toEqual(draft({ japanese: "食べる" }));
  });

  it("takes romaji for the reading, and offers it in kana as the writing", () => {
    expect(draftFrom("taberu")).toEqual(draft({ japanese: "たべる", reading: "taberu" }));
  });

  it("takes anything else for the meaning", () => {
    expect(draftFrom("to eat lunch")).toEqual(draft({ kind: "phrase", meaning: "to eat lunch" }));
  });
});

describe("ownMarkup", () => {
  it("puts each reading over its kanji", () => {
    expect(ownMarkup("食べる", "たべる")).toBe("{食|た}べる");
    expect(ownMarkup("私は学生です。", "わたしはがくせいです")).toBe("{私|わたし}は{学生|がくせい}です。");
  });

  it("lines up a particle typed as it is said", () => {
    const markup = ownMarkup("私は学校へ行きます", "わたしわがっこうえいきます");
    expect(markup).toBe("{私|わたし}は{学校|がっこう}へ{行|い}きます");
    expect(toReading(markup)).toBe("わたしはがっこうへいきます");
  });

  it("leaves kana alone, and katakana in the writing as it is", () => {
    expect(ownMarkup("たべる", "")).toBe("たべる");
    expect(ownMarkup("コーヒーを飲む", "こーひーをのむ")).toBe("コーヒーを{飲|の}む");
  });

  it("gives kanji either side of punctuation one reading", () => {
    expect(ownMarkup("東京、大阪", "とうきょうおおさか")).toBe("{東京、大阪|とうきょうおおさか}");
  });

  it("puts the whole reading over the whole text when they don't line up", () => {
    expect(ownMarkup("食べる", "のむ")).toBe("{食べる|のむ}");
  });
});

describe("ownItem", () => {
  it("makes a word from its writing, reading and meaning", () => {
    expect(made({ japanese: "食べる", reading: "たべる", meaning: "to eat; to have a meal" })).toEqual({
      id: "own-test",
      category: "vocab",
      jp: "{食|た}べる",
      meaning: ["to eat", "to have a meal"],
      saidParticles: true,
    });
  });

  it("needs no reading for kana, and takes romaji for the writing", () => {
    expect(made({ japanese: "ねこ", meaning: "cat" }).jp).toBe("ねこ");
    expect(made({ japanese: "neko", meaning: "cat" })).toMatchObject({ jp: "ねこ", romaji: ["neko"] });
  });

  it("keeps a reading typed in romaji as the romaji to show", () => {
    const item = made({ kind: "sentence", japanese: "私は学生です。", reading: "Watashi wa gakusei desu", meaning: "I am a student." });
    expect(item).toMatchObject({ category: "sentence", jp: "{私|わたし}は{学生|がくせい}です。", romaji: ["watashi wa gakusei desu"] });
  });

  it("says what is missing or wrong", () => {
    const problem = (fields: Partial<OwnDraft>) => {
      const result = ownItem(draft(fields), "own-test");
      return "field" in result ? result.field : null;
    };
    expect(problem({ meaning: "cat" })).toBe("japanese");
    expect(problem({ japanese: "cat", meaning: "cat" })).toBe("japanese");
    expect(problem({ japanese: "{猫|ねこ}", reading: "ねこ", meaning: "cat" })).toBe("japanese");
    expect(problem({ japanese: "猫", meaning: "cat" })).toBe("reading");
    expect(problem({ japanese: "猫", reading: "猫", meaning: "cat" })).toBe("reading");
    expect(problem({ japanese: "猫", reading: "cat", meaning: "cat" })).toBe("reading");
    expect(problem({ japanese: "猫", reading: "ねこ", meaning: " ; " })).toBe("meaning");
    expect(problem({ japanese: "猫", reading: "ねこ", meaning: "cat" })).toBeNull();
  });
});

describe("entryItem", () => {
  const entry = (fields: Partial<JmEntry>): JmEntry => ({ s: 1, r: ["よむ"], e: [{ g: ["to read"], p: ["v5m", "vt"] }], ...fields });

  it("makes a quiz word of a dictionary entry", () => {
    const item = entryItem(
      entry({
        s: 1456360,
        k: ["読む"],
        e: [
          { g: ["to read"], p: ["v5m", "vt"] },
          { g: ["to recite (e.g. a sutra)", "to chant"] },
          { g: ["to predict", "to guess"], m: ["arch"] },
        ],
      }),
    );
    expect(item).toEqual({ id: "jmd-1456360", category: "vocab", jp: "{読|よ}む", meaning: ["to read", "to recite"], pos: "verb" });
    expect(dictionaryWordId(1456360)).toBe(item.id);
    expect(isOwnId(item.id)).toBe(false);
  });

  it("writes a word in kana when it usually is, and lets an expression's particle be typed as said", () => {
    const item = entryItem(entry({ k: ["其れでは"], r: ["それでは"], e: [{ g: ["well then"], p: ["exp", "conj"], m: ["uk"] }] }));
    expect(item).toMatchObject({ jp: "それでは", pos: "expression", saidParticles: true });
  });
});

describe("the learner's own items in the library", () => {
  const cat = made({ japanese: "三毛猫", reading: "みけねこ", meaning: "calico cat" }, "own-cat");
  const greeting = made({ kind: "phrase", japanese: "こんにちは", meaning: "hello" }, "own-hello");
  const sentence = made(
    { kind: "sentence", japanese: "私は毎朝コーヒーを飲みます。", reading: "わたしはまいあさこーひーをのみます", meaning: "I drink coffee every morning." },
    "own-coffee",
  );

  it("join it, are found like any other entry, and leave again", () => {
    const size = LIBRARY.length;
    const before = libraryRevision();
    expect(setCustomItems([cat, greeting])).toBe(true);
    expect(libraryRevision()).toBeGreaterThan(before);
    expect(LIBRARY).toHaveLength(size + 2);
    expect(ITEMS_BY_ID.get("own-cat")).toMatchObject({ surface: "三毛猫", reading: "みけねこ", category: "vocab", groups: [CUSTOM_GROUP] });
    expect(ITEMS_BY_GROUP.get(CUSTOM_GROUP)!.map((item) => item.id)).toEqual(["own-cat", "own-hello"]);
    expect(searchDictionary("calico")[0].id).toBe("own-cat");
    expect(searchDictionary("みけねこ")[0].id).toBe("own-cat");

    // The same list again changes nothing.
    expect(setCustomItems([cat, greeting])).toBe(false);

    expect(setCustomItems([greeting])).toBe(true);
    expect(LIBRARY).toHaveLength(size + 1);
    expect(ITEMS_BY_ID.has("own-cat")).toBe(false);
    expect(ITEMS_BY_CATEGORY.get("vocab")!.some((item) => item.id === "own-cat")).toBe(false);
    expect(searchDictionary("calico")).toEqual([]);
  });

  it("are replaced when rewritten, and never take the place of an item the library has", () => {
    setCustomItems([cat]);
    setCustomItems([{ ...cat, meaning: ["tortoiseshell cat"] }]);
    expect(ITEMS_BY_ID.get("own-cat")!.meaning).toEqual(["tortoiseshell cat"]);

    const taught = LIBRARY.find((item) => item.category === "vocab")!;
    expect(setCustomItems([{ ...cat, id: taught.id }])).toBe(true); // own-cat leaves…
    expect(ITEMS_BY_ID.get(taught.id)).toBe(taught); // …and the library's own item is untouched
  });

  it("take a reading with its particles spelled or said, and a meaning in other words", () => {
    setCustomItems([greeting, sentence]);
    const hello = ITEMS_BY_ID.get("own-hello")!;
    expect(checkReading(hello, "konnichiha")).toBe(true);
    expect(checkReading(hello, "konnichiwa")).toBe(true);
    expect(checkReading(hello, "konbanwa")).toBe(false);

    const coffee = ITEMS_BY_ID.get("own-coffee")!;
    expect(toSurface(coffee.jp)).toBe("私は毎朝コーヒーを飲みます。");
    expect(checkReading(coffee, "watashi wa maiasa koohii o nomimasu")).toBe(true);
    expect(checkReading(coffee, "watashi ha maiasa ko-hi- wo nomimasu")).toBe(true);
    expect(checkReading(coffee, "watashi wa maiasa ocha o nomimasu")).toBe(false);
    expect(checkMeaning(coffee, "every morning I drink coffee")).toBe(true);
  });

  it("don't loosen the reading of the library's own words", () => {
    const hashi = LIBRARY.find((item) => item.category === "vocab" && item.reading.startsWith("は"))!;
    expect(checkReading(hashi, hashi.romaji[0])).toBe(true);
    expect(checkReading(hashi, hashi.romaji[0].replace(/^ha/, "wa"))).toBe(false);
  });
});
