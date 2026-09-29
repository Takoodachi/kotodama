import { toKatakana } from "wanakana";
import { describe, expect, it } from "vitest";
import { ITEMS_BY_ID } from "@/data/library";
import { checkGap, checkJapanese, checkMeaning, checkReading } from "./check";

const item = (id: string) => {
  const found = ITEMS_BY_ID.get(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

describe("checkGap", () => {
  it("wants the right spelling in Japanese", () => {
    expect(checkGap(item("g-waga-1"), "は", "jp")).toBe(true);
    expect(checkGap(item("g-waga-1"), "わ", "jp")).toBe(false);
    expect(checkGap(item("g-waga-1"), "が", "jp")).toBe(false);
    expect(checkGap(item("g-waga-1"), "wa", "jp")).toBe(false);
  });

  it("takes particles in romaji as said or as spelled", () => {
    expect(checkGap(item("g-waga-1"), "wa", "romaji")).toBe(true);
    expect(checkGap(item("g-waga-1"), "ha", "romaji")).toBe(true);
    expect(checkGap(item("g-woni-1"), "o", "romaji")).toBe(true);
    expect(checkGap(item("g-woni-1"), "wo", "romaji")).toBe(true);
    expect(checkGap(item("g-exp-3"), "hō", "romaji")).toBe(true);
    expect(checkGap(item("g-adj-5"), "nai desu", "romaji")).toBe(true);
    expect(checkGap(item("g-waga-1"), "ga", "romaji")).toBe(false);
  });

  it("accepts the other correct fillers", () => {
    expect(checkGap(item("g-woni-3"), "へ", "jp")).toBe(true);
    expect(checkGap(item("g-woni-3"), "e", "romaji")).toBe(true);
    expect(checkGap(item("g-adj-5"), "ありません", "jp")).toBe(true);
  });
});

describe("checkReading", () => {
  it("accepts common romanizations of kana", () => {
    expect(checkReading(item("h-し"), "shi")).toBe(true);
    expect(checkReading(item("h-し"), "si")).toBe(true);
    expect(checkReading(item("h-つ"), "TU")).toBe(true);
    expect(checkReading(item("h-を"), "o")).toBe(true);
    expect(checkReading(item("h-ん"), "nn")).toBe(true);
    expect(checkReading(item("h-ぢ"), "di")).toBe(true);
    expect(checkReading(item("h-じゃ"), "jya")).toBe(true);
  });

  it("accepts the same j spellings for ぢ and づ as for じ and ず, and d spellings only for the d-row", () => {
    const twins = [["じ", "ぢ"], ["ず", "づ"], ["じゃ", "ぢゃ"], ["じゅ", "ぢゅ"], ["じょ", "ぢょ"]];
    for (const [z, d] of twins) {
      for (const prefix of ["h", "k"]) {
        const kana = (k: string) => item(`${prefix}-${prefix === "k" ? toKatakana(k) : k}`);
        for (const romaji of kana(z).romaji.filter((r) => !r.startsWith("z"))) {
          expect(checkReading(kana(d), romaji), `${d} ${romaji}`).toBe(true);
        }
      }
    }
    expect(checkReading(item("h-ぢゃ"), "jya")).toBe(true);
    expect(checkReading(item("h-づ"), "du")).toBe(true);
    expect(checkReading(item("h-じ"), "di")).toBe(false);
    expect(checkReading(item("h-ず"), "du")).toBe(false);
  });

  it("takes either twin when typing a plain 'ji' or 'zu' card, but only the d-row for 'ji (di)'", () => {
    expect(checkJapanese(item("h-じ"), "ぢ")).toBe(true);
    expect(checkJapanese(item("h-ず"), "づ")).toBe(true);
    expect(checkJapanese(item("h-じゃ"), "ぢゃ")).toBe(true);
    expect(checkJapanese(item("k-ジ"), "ヂ")).toBe(true);
    expect(checkJapanese(item("k-ジ"), "ぢ")).toBe(false);
    expect(checkJapanese(item("h-ぢ"), "じ")).toBe(false);
    expect(checkJapanese(item("h-づ"), "ず")).toBe(false);
  });

  it("rejects wrong kana readings", () => {
    expect(checkReading(item("h-し"), "chi")).toBe(false);
    expect(checkReading(item("k-ティ"), "chi")).toBe(false);
    expect(checkReading(item("k-ティ"), "ti")).toBe(true);
    expect(checkReading(item("h-ぬ"), "")).toBe(false);
  });

  it("accepts spelling variants and macrons for words", () => {
    expect(checkReading(item("v-gakkou"), "gakkō")).toBe(true);
    expect(checkReading(item("v-gakkou"), "gakkou")).toBe(true);
    expect(checkReading(item("v-shinbun"), "shimbun")).toBe(true);
    expect(checkReading(item("v-sensei"), "sennsei")).toBe(true);
    expect(checkReading(item("v-koohii"), "kōhī")).toBe(true);
    expect(checkReading(item("v-tsukau"), "tukau")).toBe(true);
    expect(checkReading(item("v-gakkou"), "gako")).toBe(false);
  });

  it("accepts particles written either as pronounced or as spelled", () => {
    const sentence = item("s-desu-1");
    expect(checkReading(sentence, "watashi wa gakusei desu")).toBe(true);
    expect(checkReading(sentence, "Watashi ha gakusei desu.")).toBe(true);
    expect(checkReading(sentence, "watashi wa sensei desu")).toBe(false);
    expect(checkReading(item("p-konnichiwa"), "konnichiwa")).toBe(true);
  });

  it("accepts any on'yomi or kun'yomi for kanji", () => {
    const sun = item("k-日");
    expect(checkReading(sun, "nichi")).toBe(true);
    expect(checkReading(sun, "hi")).toBe(true);
    expect(checkReading(sun, "jitsu")).toBe(true);
    expect(checkReading(item("k-食"), "taberu")).toBe(true);
    expect(checkReading(sun, "getsu")).toBe(false);
  });
});

describe("checkMeaning", () => {
  it("ignores case, articles, 'to' and notes in parentheses", () => {
    expect(checkMeaning(item("v-taberu"), "eat")).toBe(true);
    expect(checkMeaning(item("v-taberu"), "To Eat")).toBe(true);
    expect(checkMeaning(item("v-atsui"), "hot")).toBe(true);
    expect(checkMeaning(item("k-日"), "the sun")).toBe(true);
  });

  it("forgives a small typo in longer words only", () => {
    expect(checkMeaning(item("v-kudamono"), "friut")).toBe(true);
    expect(checkMeaning(item("v-toshokan"), "libary")).toBe(true);
    expect(checkMeaning(item("v-inu"), "cog")).toBe(false);
    expect(checkMeaning(item("v-inu"), "cat")).toBe(false);
  });
});

describe("checkJapanese", () => {
  it("accepts the written form or the kana reading", () => {
    expect(checkJapanese(item("v-taberu"), "食べる")).toBe(true);
    expect(checkJapanese(item("v-taberu"), "たべる")).toBe(true);
    expect(checkJapanese(item("v-taberu"), "のむ")).toBe(false);
    expect(checkJapanese(item("s-desu-1"), "私は学生です")).toBe(true);
    expect(checkJapanese(item("k-日"), "日")).toBe(true);
    expect(checkJapanese(item("k-日"), "にち")).toBe(true);
  });

  it("does not count raw romaji as Japanese", () => {
    expect(checkJapanese(item("v-taberu"), "taberu")).toBe(false);
  });

  it("is strict about script only for the katakana set", () => {
    expect(checkJapanese(item("k-カ"), "カ")).toBe(true);
    expect(checkJapanese(item("k-カ"), "か")).toBe(false);
    expect(checkJapanese(item("v-koohii"), "こーひー")).toBe(true);
    expect(checkJapanese(item("v-koohii"), "ｺｰﾋｰ")).toBe(true);
  });
});
