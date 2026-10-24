import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ITEMS_BY_ID } from "@/data/library";
import type { CustomItem } from "@/lib/customQuiz";
import { emptyOwn, quizOf } from "@/lib/sync/ownDoc";

const cat: CustomItem = { id: "own-cat", category: "vocab", jp: "{三毛猫|みけねこ}", meaning: ["calico cat"], saidParticles: true };
const oil: CustomItem = { id: "jmd-1", category: "vocab", jp: "ラー{油|ユ}", meaning: ["chili oil"], pos: "noun" };

// The store saves itself to localStorage, which a test run doesn't have.
let useCustomQuiz: typeof import("./customQuiz").useCustomQuiz;
beforeAll(async () => {
  const saved = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => void saved.set(key, value),
    removeItem: (key: string) => void saved.delete(key),
  });
  ({ useCustomQuiz } = await import("./customQuiz"));
});

const quiz = () => useCustomQuiz.getState();

beforeEach(() => quiz().clearLocal());

describe("the learner's own quiz", () => {
  it("keeps items in the order they were added, each once", () => {
    quiz().add("v-taberu");
    quiz().add("jmd-1", oil);
    quiz().add("v-taberu");
    expect(quiz().quiz).toEqual(["v-taberu", "jmd-1"]);
    expect(quiz().items).toEqual([oil]);
    // A dictionary word kept with the quiz is in the library for as long as it is.
    expect(ITEMS_BY_ID.get("jmd-1")?.surface).toBe("ラー油");
  });

  it("takes items out, one or all, and keeps the words that came with them", () => {
    quiz().add("a");
    quiz().add("jmd-1", oil);
    quiz().add("c");
    quiz().remove(["jmd-1", "not-there"]);
    expect(quiz().quiz).toEqual(["a", "c"]);
    expect(quiz().items).toEqual([oil]);
    quiz().clear();
    expect(quiz().quiz).toEqual([]);
    quiz().add("jmd-1");
    expect(quiz().quiz).toEqual(["jmd-1"]);
  });

  it("replaces an entry written the same way, keeping its id", () => {
    expect(quiz().saveOwn(cat)).toBe("own-cat");
    expect(quiz().saveOwn({ ...cat, id: "own-new", meaning: ["tortoiseshell cat"] })).toBe("own-cat");
    expect(quiz().items).toEqual([{ ...cat, meaning: ["tortoiseshell cat"] }]);
    expect(quiz().quiz).toEqual(["own-cat"]);
    expect(ITEMS_BY_ID.get("own-cat")?.meaning).toEqual(["tortoiseshell cat"]);
  });

  it("deletes an entry from the quiz and the library too", () => {
    quiz().saveOwn(cat);
    quiz().deleteOwn("own-cat");
    expect(quiz().quiz).toEqual([]);
    expect(quiz().items).toEqual([]);
    expect(ITEMS_BY_ID.has("own-cat")).toBe(false);
    // Written again, it is a new entry.
    expect(quiz().saveOwn({ ...cat, id: "own-again" })).toBe("own-again");
  });

  it("merges in what another device did, and its later changes win", () => {
    quiz().add("a");
    quiz().saveOwn(cat);
    const later = Date.now() + 10_000;
    quiz().mergeDoc({
      quiz: { a: { at: later, in: false }, b: { at: later, in: true } },
      items: { "jmd-1": { at: later, item: oil } },
      saved: {},
    });
    expect(quiz().quiz).toEqual(["own-cat", "b"]);
    expect(quiz().items).toEqual([cat, oil]);

    // The same again changes nothing, not even the lists drawn from it.
    const before = quiz().quiz;
    quiz().mergeDoc(quiz().doc);
    expect(quiz().quiz).toBe(before);

    // A change made here after that beats the other device's older one.
    quiz().add("a");
    expect(quizOf(quiz().doc)).toEqual(["own-cat", "b", "a"]);
  });

  it("takes another account's quiz as it is, and forgets its own on signing out", () => {
    quiz().add("a");
    quiz().mergeDoc({ quiz: { z: { at: 5, in: true } }, items: {}, saved: {} }, true);
    expect(quiz().quiz).toEqual(["z"]);
    quiz().clearLocal();
    expect(quiz().doc).toEqual(emptyOwn());
    expect(quiz().quiz).toEqual([]);
  });

  it("puts quizzes by under a name and loads them again, in their order", () => {
    quiz().add("a");
    quiz().add("jmd-1", oil);
    quiz().saveQuiz("Food");
    quiz().clear();
    quiz().add("b");
    quiz().saveQuiz("Verbs");
    quiz().loadQuiz(quiz().saved[0].id);
    expect(quiz().saved.map((saved) => saved.name)).toEqual(["Food", "Verbs"]);
    expect(quiz().quiz).toEqual(["a", "jmd-1"]);
    // A word kept with a saved quiz is still in the library when the quiz comes back.
    expect(ITEMS_BY_ID.has("jmd-1")).toBe(true);

    // Saved again under the same name, it is replaced; deleted, it is gone.
    quiz().add("c");
    quiz().saveQuiz("Food");
    expect(quiz().saved.map((saved) => [saved.name, saved.ids])).toEqual([
      ["Food", ["a", "jmd-1", "c"]],
      ["Verbs", ["b"]],
    ]);
    quiz().deleteSaved(quiz().saved[1].id);
    expect(quiz().saved.map((saved) => saved.name)).toEqual(["Food"]);
  });

  it("leaves out of a loaded quiz an entry deleted since it was saved", () => {
    quiz().saveOwn(cat);
    quiz().add("a");
    quiz().saveQuiz("Mine");
    quiz().deleteOwn("own-cat");
    quiz().clear();
    quiz().loadQuiz(quiz().saved[0].id);
    expect(quiz().quiz).toEqual(["a"]);
  });
});
