import { HIRAGANA_ROWS, KATAKANA_ROWS, type KanaRow } from "./kana";

export type KanaScript = "hiragana" | "katakana";

export interface KanaCell {
  kana: string;
  romaji: string;
}

export interface KanaChartRow {
  /** The row's sounds under their vowels, a i u e o; null where it has none (や ゆ よ). */
  main: (KanaCell | null)[];
  /** Its combinations with a small ゃ ゅ ょ, for the rows that have them. */
  combo: KanaCell[];
}

export interface KanaChart {
  script: KanaScript;
  /** The plain rows, あ to ん. */
  basic: KanaChartRow[];
  /** The rows with dakuten and handakuten, が to ぽ. */
  voiced: KanaChartRow[];
  /** Katakana only: the sounds written for loanwords. */
  extended: KanaCell[];
}

const VOWELS = "aiueo";

const cellOf = (item: KanaRow["items"][number]): KanaCell => ({ kana: item.jp, romaji: item.romaji?.[0] ?? "" });

function chartRows(rows: KanaRow[], kinds: KanaRow["kind"][]): KanaChartRow[] {
  const combos = rows.filter((row) => row.kind === "combo");
  return rows
    .filter((row) => kinds.includes(row.kind))
    .flatMap((row) => {
      const main: (KanaCell | null)[] = [null, null, null, null, null];
      const apart: KanaCell[] = [];
      for (const cell of row.items.map(cellOf)) {
        const column = VOWELS.indexOf(cell.romaji.slice(-1));
        if (column < 0) apart.push(cell);
        else main[column] = cell;
      }
      // A row's combinations are built on its い sound: き gives きゃ きゅ きょ.
      const stem = main[1]?.kana;
      const combo = combos.find((c) => stem && c.items[0].jp.startsWith(stem))?.items.map(cellOf) ?? [];
      // ん has no vowel to sit under, so it gets a row to itself.
      return [{ main, combo }, ...apart.map((cell) => ({ main: [cell, null, null, null, null], combo: [] }))];
    });
}

function buildChart(script: KanaScript, rows: KanaRow[]): KanaChart {
  return {
    script,
    basic: chartRows(rows, ["main"]),
    voiced: chartRows(rows, ["dakuten", "handakuten"]),
    extended: rows.filter((row) => row.kind === "extended").flatMap((row) => row.items.map(cellOf)),
  };
}

/** The kana laid out as a chart to look things up in: rows by consonant, columns by vowel. */
export const KANA_CHARTS: Record<KanaScript, KanaChart> = {
  hiragana: buildChart("hiragana", HIRAGANA_ROWS),
  katakana: buildChart("katakana", KATAKANA_ROWS),
};
