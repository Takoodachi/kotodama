import { describe, expect, it } from "vitest";
import { ITEMS_BY_ID } from "@/data/library";
import { seededRng } from "@/lib/random";
import { directionLimits, pickDirection } from "./directions";

describe("directionLimits", () => {
  it("only explains kinds of item that can't be asked a way that's turned on", () => {
    expect(directionLimits(["vocab", "phrase"], "choice", ["jp-en", "romaji-jp"])).toEqual([]);
    expect(directionLimits(["kanji"], "choice", ["jp-en", "jp-romaji"])).toEqual([]);
    expect(directionLimits(["hiragana", "vocab"], "choice", ["jp-en", "jp-romaji"])).toEqual([
      expect.objectContaining({ label: "Kana", used: ["jp-romaji"] }),
    ]);
    expect(directionLimits(["kanji"], "typing", ["en-jp", "romaji-jp"])).toEqual([
      expect.objectContaining({ label: "Kanji", used: ["en-jp"] }),
    ]);
    expect(directionLimits(["sentence"], "reading", ["jp-en"])).toEqual([]);
  });

  it("falls back to every way the kind supports when none that are on fit", () => {
    expect(directionLimits(["katakana"], "choice", ["jp-en"])[0].used).toEqual(["jp-romaji", "romaji-jp"]);
  });
});

describe("pickDirection in reading mode", () => {
  const ask = (id: string, answerWith: "jp-romaji" | "jp-en" | "jp-both") =>
    pickDirection(ITEMS_BY_ID.get(id)!, "reading", [answerWith], seededRng(1));

  it("asks words, phrases, sentences and kanji the way chosen", () => {
    for (const id of ["v-taberu", "p-ohayou", "s-masu-1", "k-日"]) {
      expect(ask(id, "jp-en")).toBe("jp-en");
      expect(ask(id, "jp-both")).toBe("jp-both");
    }
  });

  it("always asks kana for the reading and grammar for the missing word", () => {
    expect(ask("h-あ", "jp-both")).toBe("jp-romaji");
    expect(ask("h-あ", "jp-en")).toBe("jp-romaji");
    expect(ask("g-waga-1", "jp-both")).toBe("cloze-romaji");
  });
});
