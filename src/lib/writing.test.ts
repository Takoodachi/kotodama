import { describe, expect, it } from "vitest";
import { writeAs, writeSurfaceAs } from "./writing";

const SENTENCE = "{私|わたし}はコーヒーを{飲|の}みます。";

describe("writeAs", () => {
  it("leaves normal writing alone when everything is chosen", () => {
    expect(writeAs(SENTENCE, ["kanji", "hiragana", "katakana"])).toBe(SENTENCE);
  });

  it("writes everything in hiragana", () => {
    expect(writeAs(SENTENCE, ["hiragana"])).toBe("わたしはこーひーをのみます。");
  });

  it("writes everything in katakana", () => {
    expect(writeAs(SENTENCE, ["katakana"])).toBe("ワタシハコーヒーヲノミマス。");
  });

  it("uses both kana naturally: loanwords stay katakana, kanji become hiragana", () => {
    expect(writeAs(SENTENCE, ["hiragana", "katakana"])).toBe("わたしはコーヒーをのみます。");
  });

  it("keeps kanji with furigana when kanji is chosen", () => {
    expect(writeAs(SENTENCE, ["kanji", "hiragana"])).toBe("{私|わたし}はこーひーを{飲|の}みます。");
    expect(writeAs(SENTENCE, ["kanji", "katakana"])).toBe("{私|わたし}ハコーヒーヲ{飲|の}ミマス。");
    expect(writeAs(SENTENCE, ["kanji"])).toBe(SENTENCE);
  });

  it("handles small kana, sokuon and long vowels", () => {
    expect(writeSurfaceAs("{学校|がっこう}", ["katakana"])).toBe("ガッコウ");
    expect(writeSurfaceAs("{牛乳|ぎゅうにゅう}", ["katakana"])).toBe("ギュウニュウ");
    expect(writeSurfaceAs("アイスクリーム", ["hiragana"])).toBe("あいすくりーむ");
  });
});
