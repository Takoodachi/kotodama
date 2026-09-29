import { describe, expect, it } from "vitest";
import { directionLimits } from "./directions";

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
    expect(directionLimits(["sentence"], "reading", ["jp-romaji", "jp-en"])).toEqual([
      expect.objectContaining({ label: "Sentences", used: ["jp-romaji"] }),
    ]);
  });

  it("falls back to every way the kind supports when none that are on fit", () => {
    expect(directionLimits(["katakana"], "choice", ["jp-en"])[0].used).toEqual(["jp-romaji", "romaji-jp"]);
  });
});
