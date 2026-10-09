import { describe, expect, it } from "vitest";
import { HIRAGANA_ROWS, KATAKANA_ROWS } from "./kana";
import { KANA_CHARTS, type KanaChart } from "./kanaChart";

const cells = (chart: KanaChart) => [
  ...[...chart.basic, ...chart.voiced].flatMap((row) => [...row.main, ...row.combo]).filter((cell) => cell !== null),
  ...chart.extended,
];

const kanaOf = (chart: KanaChart) => cells(chart).map((cell) => cell.kana);

describe("kana charts", () => {
  it("show every kana the app teaches, once", () => {
    for (const [chart, rows] of [
      [KANA_CHARTS.hiragana, HIRAGANA_ROWS],
      [KANA_CHARTS.katakana, KATAKANA_ROWS],
    ] as const) {
      const taught = rows.flatMap((row) => row.items.map((item) => item.jp));
      expect([...kanaOf(chart)].sort()).toEqual([...taught].sort());
    }
  });

  it("put each sound under its vowel", () => {
    for (const chart of Object.values(KANA_CHARTS)) {
      for (const row of [...chart.basic, ...chart.voiced]) {
        row.main.forEach((cell, column) => {
          if (cell && cell.romaji !== "n") expect(cell.romaji.endsWith("aiueo"[column]), cell.kana).toBe(true);
        });
      }
    }
    const rowOf = (kana: string) => KANA_CHARTS.hiragana.basic.find((row) => row.main[0]?.kana === kana)!;
    expect(rowOf("や").main.map((cell) => cell?.kana ?? "")).toEqual(["や", "", "ゆ", "", "よ"]);
    expect(rowOf("わ").main.map((cell) => cell?.kana ?? "")).toEqual(["わ", "", "", "", "を"]);
    expect(rowOf("ん").main.map((cell) => cell?.kana ?? "")).toEqual(["ん", "", "", "", ""]);
  });

  it("set a row's combinations beside it", () => {
    const { basic, voiced } = KANA_CHARTS.hiragana;
    const combosOf = (kana: string) =>
      [...basic, ...voiced].find((row) => row.main[0]?.kana === kana)!.combo.map((cell) => cell.kana);
    expect(combosOf("か")).toEqual(["きゃ", "きゅ", "きょ"]);
    expect(combosOf("さ")).toEqual(["しゃ", "しゅ", "しょ"]);
    expect(combosOf("だ")).toEqual(["ぢゃ", "ぢゅ", "ぢょ"]);
    expect(combosOf("ぱ")).toEqual(["ぴゃ", "ぴゅ", "ぴょ"]);
    expect(combosOf("あ")).toEqual([]);
    expect(combosOf("や")).toEqual([]);
  });

  it("keep the loanword sounds for katakana", () => {
    expect(KANA_CHARTS.hiragana.extended).toEqual([]);
    expect(KANA_CHARTS.katakana.extended.map((cell) => cell.kana)).toContain("ファ");
    expect(KANA_CHARTS.katakana.basic[0].main.map((cell) => cell?.romaji)).toEqual(["a", "i", "u", "e", "o"]);
  });
});
