import { describe, expect, it } from "vitest";
import type { CustomItem } from "@/lib/customQuiz";
import { emptyOwn, itemsOf, mergeOwn, quizOf, readOwn, savedOf, stamp, type OwnDoc } from "./ownDoc";
import { emptyDoc, mergeDocs, readDoc, sameDoc } from "./progressDoc";

const cat: CustomItem = { id: "own-cat", category: "vocab", jp: "{三毛猫|みけねこ}", meaning: ["calico cat"], saidParticles: true };
const oil: CustomItem = { id: "jmd-1", category: "vocab", jp: "ラー{油|ユ}", meaning: ["chili oil"], pos: "noun" };

function own(parts: Partial<OwnDoc>): OwnDoc {
  return { ...emptyOwn(), ...parts };
}

const same = (a: OwnDoc, b: OwnDoc) => expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));

describe("quizOf and itemsOf", () => {
  it("list what is in the quiz in the order it was added, and the items still kept", () => {
    const doc = own({
      quiz: { b: { at: 20, in: true }, a: { at: 10, in: true }, gone: { at: 30, in: false }, c: { at: 20, in: true } },
      items: { "jmd-1": { at: 5, item: oil }, "own-cat": { at: 2, item: cat }, "own-old": { at: 9, item: null } },
    });
    expect(quizOf(doc)).toEqual(["a", "b", "c"]);
    expect(itemsOf(doc)).toEqual([cat, oil]);
  });
});

describe("mergeOwn", () => {
  const phone = own({
    quiz: { a: { at: 100, in: true }, b: { at: 300, in: false } },
    items: { "own-cat": { at: 100, item: cat } },
  });
  const laptop = own({
    quiz: { b: { at: 200, in: true }, c: { at: 150, in: true } },
    items: { "own-cat": { at: 250, item: { ...cat, meaning: ["tortoiseshell cat"] } }, "jmd-1": { at: 120, item: oil } },
  });

  it("keeps what either device added, and the later word on anything both touched", () => {
    const merged = mergeOwn(phone, laptop);
    // b was added on the laptop, then taken out on the phone: it stays out.
    expect(quizOf(merged)).toEqual(["a", "c"]);
    expect(itemsOf(merged).map((item) => item.meaning[0])).toEqual(["chili oil", "tortoiseshell cat"]);
  });

  it("lets a deletion stand against an older copy, and a rewrite against an older deletion", () => {
    const deleted = own({ items: { "own-cat": { at: 400, item: null } } });
    expect(itemsOf(mergeOwn(laptop, deleted))).toEqual([oil]);
    const rewritten = own({ items: { "own-cat": { at: 500, item: cat } } });
    expect(itemsOf(mergeOwn(deleted, rewritten))).toEqual([cat]);
  });

  it("gives the same result in either order, and merging again changes nothing", () => {
    const ab = mergeOwn(phone, laptop);
    same(ab, mergeOwn(laptop, phone));
    same(mergeOwn(ab, phone), ab);
    same(mergeOwn(ab, ab), ab);
    // Saved quizzes merge the same way: a later deletion stands, a new one is kept.
    const saves = own({ saved: { s1: { at: 400, quiz: null }, s2: { at: 100, quiz: { name: "Food", ids: ["a"] } } } });
    const older = own({ saved: { s1: { at: 300, quiz: { name: "Old", ids: ["b"] } } } });
    expect(savedOf(mergeOwn(older, saves))).toEqual([{ id: "s2", name: "Food", ids: ["a"] }]);
    // Two changes at the same moment still come out one way.
    const x = own({ quiz: { a: { at: 100, in: false } } });
    same(mergeOwn(phone, x), mergeOwn(x, phone));
  });
});

describe("stamp", () => {
  it("is always after the change it replaces, even with a clock that is behind", () => {
    const ahead = Date.now() + 60_000;
    expect(stamp({ at: ahead })).toBe(ahead + 1);
    expect(stamp()).toBeGreaterThan(0);
  });
});

describe("readOwn", () => {
  it("drops anything malformed instead of failing", () => {
    expect(readOwn(undefined)).toEqual(emptyOwn());
    expect(readOwn("nope")).toEqual(emptyOwn());
    const doc = readOwn({
      quiz: { a: { at: 5, in: true }, b: { at: "x", in: true }, c: { at: 7 }, d: "bad" },
      items: {
        "own-cat": { at: 3, item: { ...cat, id: "something-else", extra: 1 } },
        "own-gone": { at: 4, item: null },
        "own-bad": { at: 6, item: { category: "kanji", jp: "猫", meaning: ["cat"] } },
        "own-empty": { at: 6, item: { category: "vocab", jp: "猫", meaning: [] } },
        "own-undated": { item: cat },
      },
    });
    expect(doc.quiz).toEqual({ a: { at: 5, in: true }, c: { at: 7, in: false } });
    expect(
      readOwn({
        saved: {
          s1: { at: 2, quiz: { name: "Food", ids: ["a", "b"], extra: 1 } },
          s2: { at: 3, quiz: null },
          s3: { at: 4, quiz: { name: "", ids: ["a"] } },
          s4: { at: 5, quiz: { name: "Bad", ids: [1] } },
          s5: { quiz: { name: "Undated", ids: [] } },
        },
      }).saved,
    ).toEqual({ s1: { at: 2, quiz: { name: "Food", ids: ["a", "b"] } }, s2: { at: 3, quiz: null } });
    // The id an item is filed under is the id it has.
    expect(doc.items).toEqual({ "own-cat": { at: 3, item: cat }, "own-gone": { at: 4, item: null } });
  });
});

describe("the quiz in the progress document", () => {
  const withQuiz = { ...emptyDoc(), own: own({ quiz: { a: { at: 10, in: true } }, items: { "own-cat": { at: 10, item: cat } } }) };

  it("is merged with the progress, and read back from what was saved", () => {
    const other = { ...emptyDoc(), own: own({ quiz: { b: { at: 20, in: true } } }) };
    const merged = mergeDocs(withQuiz, other);
    expect(quizOf(merged.own)).toEqual(["a", "b"]);
    expect(sameDoc(readDoc(JSON.parse(JSON.stringify(merged))), merged)).toBe(true);
  });

  it("is empty for an account saved before there was one", () => {
    expect(readDoc({ v: 1, resetAt: 0, records: {}, streak: {}, devices: {} }).own).toEqual(emptyOwn());
  });

  it("is left alone by a reset of progress", () => {
    const reset = emptyDoc(1_000);
    expect(quizOf(mergeDocs(withQuiz, reset).own)).toEqual(["a"]);
    expect(quizOf(mergeDocs(reset, withQuiz).own)).toEqual(["a"]);
    expect(mergeDocs(reset, withQuiz).resetAt).toBe(1_000);
  });
});
