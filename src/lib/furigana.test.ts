import { describe, expect, it } from "vitest";
import { isWellFormedFurigana, parseFurigana, toReading, toSurface } from "./furigana";

describe("furigana markup", () => {
  it("splits text into plain and ruby segments", () => {
    expect(parseFurigana("{食|た}べる")).toEqual([{ text: "食", ruby: "た" }, { text: "べる" }]);
    expect(parseFurigana("これは{本|ほん}です。")).toEqual([
      { text: "これは" },
      { text: "本", ruby: "ほん" },
      { text: "です。" },
    ]);
    expect(parseFurigana("ひらがな")).toEqual([{ text: "ひらがな" }]);
  });

  it("derives the surface text and the reading", () => {
    const source = "{私|わたし}は{学生|がくせい}です。";
    expect(toSurface(source)).toBe("私は学生です。");
    expect(toReading(source)).toBe("わたしはがくせいです。");
  });

  it("detects broken markup", () => {
    expect(isWellFormedFurigana("{食|た}べる")).toBe(true);
    expect(isWellFormedFurigana("{食た}べる")).toBe(false);
    expect(isWellFormedFurigana("{食|た べる")).toBe(false);
  });
});
