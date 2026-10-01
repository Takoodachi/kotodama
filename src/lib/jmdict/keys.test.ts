import { describe, expect, it } from "vitest";
import { isWellFormedFurigana, toReading, toSurface } from "@/lib/furigana";
import { foldKana, furiganaMarkup, hasJapanese, japaneseKey, meaningWords, plainMeaning, withoutNotes } from "./keys.mjs";

describe("japaneseKey", () => {
  it("makes hiragana and katakana one, and leaves kanji and the long-vowel mark alone", () => {
    expect(foldKana("タベル")).toBe("たべる");
    expect(japaneseKey("コーヒー")).toBe("こーひー");
    expect(japaneseKey("食べる")).toBe("食べる");
    expect(japaneseKey("ヴァイオリン")).toBe(japaneseKey("ゔぁいおりん"));
  });

  it("drops separators, and narrows full-width letters", () => {
    expect(japaneseKey("ジョン・スミス")).toBe("じょんすみす");
    expect(japaneseKey(" 食べる。 ")).toBe("食べる");
    expect(japaneseKey("Ｔシャツ")).toBe("tしゃつ");
  });

  it("tells Japanese writing from Latin letters", () => {
    expect(hasJapanese("たべr")).toBe(true);
    expect(hasJapanese("食")).toBe(true);
    expect(hasJapanese("taberu")).toBe(false);
  });
});

describe("plainMeaning", () => {
  it("drops notes in parentheses, even ones inside others", () => {
    expect(withoutNotes("dog (Canis (lupus) familiaris)").trim()).toBe("dog");
    expect(plainMeaning("dog (Canis (lupus) familiaris)")).toBe("dog");
    expect(plainMeaning("to live on (e.g. a salary)")).toBe("live on");
    expect(plainMeaning("(electric) iron")).toBe("iron");
  });

  it("drops a leading 'to' or article, case, accents and punctuation", () => {
    expect(plainMeaning("To Eat")).toBe("eat");
    expect(plainMeaning("the sun")).toBe("sun");
    expect(plainMeaning("café")).toBe("cafe");
    expect(plainMeaning("I'm home!")).toBe("i'm home");
    expect(plainMeaning("well-known")).toBe("well known");
  });

  it("keeps a meaning that is only 'to' or an article", () => {
    expect(plainMeaning("the")).toBe("the");
    expect(plainMeaning("to")).toBe("to");
  });
});

describe("meaningWords", () => {
  it("leaves out words too common to search by, unless one is the whole meaning", () => {
    expect(meaningWords("by the way")).toEqual(["way"]);
    expect(meaningWords("take a bath")).toEqual(["take", "bath"]);
    expect(meaningWords("in")).toEqual(["in"]);
    expect(meaningWords("")).toEqual([]);
  });
});

describe("furiganaMarkup", () => {
  const check = (written: string, reading: string, markup: string) => {
    const made = furiganaMarkup(written, reading);
    expect(made).toBe(markup);
    expect(isWellFormedFurigana(made)).toBe(true);
    expect(toSurface(made)).toBe(written);
    expect(toReading(made)).toBe(reading);
  };

  it("puts the reading over the kanji, anchored by the kana around them", () => {
    check("食べる", "たべる", "{食|た}べる");
    check("学校", "がっこう", "{学校|がっこう}");
    check("日の出", "ひので", "{日|ひ}の{出|で}");
    check("お父さん", "おとうさん", "お{父|とう}さん");
    check("召し上がる", "めしあがる", "{召|め}し{上|あ}がる");
  });

  it("keeps katakana as written", () => {
    check("消しゴム", "けしゴム", "{消|け}しゴム");
    check("コーヒー", "コーヒー", "コーヒー");
    check("ネコ科", "ネコか", "ネコ{科|か}");
  });

  it("needs no markup for kana", () => {
    check("あそこ", "あそこ", "あそこ");
    expect(furiganaMarkup("ねこ", "ネコ")).toBe("ねこ");
  });

  it("puts the whole reading over the whole word when the two don't line up", () => {
    check("今日は", "こんにちわ", "{今日は|こんにちわ}");
  });
});
