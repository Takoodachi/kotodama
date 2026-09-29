import { toKatakana } from "wanakana";
import type { KanaKind, RawItem } from "./types";

export interface KanaRow {
  /** Group id, e.g. `hira-ka`. */
  id: string;
  kind: KanaKind;
  /** Chip label: the row's first character and its romaji. */
  label: string;
  sublabel: string;
  items: RawItem[];
}

/**
 * Rows are written as "かな romaji/alt|…". Every romaji listed is accepted as an
 * answer, and the first one is displayed.
 */
const HIRAGANA_TABLE: [key: string, kind: KanaKind, cells: string][] = [
  ["a", "main", "あ a|い i|う u|え e|お o"],
  ["ka", "main", "か ka|き ki|く ku|け ke|こ ko"],
  ["sa", "main", "さ sa|し shi/si|す su|せ se|そ so"],
  ["ta", "main", "た ta|ち chi/ti|つ tsu/tu|て te|と to"],
  ["na", "main", "な na|に ni|ぬ nu|ね ne|の no"],
  ["ha", "main", "は ha|ひ hi|ふ fu/hu|へ he|ほ ho"],
  ["ma", "main", "ま ma|み mi|む mu|め me|も mo"],
  ["ya", "main", "や ya|ゆ yu|よ yo"],
  ["ra", "main", "ら ra|り ri|る ru|れ re|ろ ro"],
  ["wa", "main", "わ wa|を wo/o|ん n/nn"],
  ["ga", "dakuten", "が ga|ぎ gi|ぐ gu|げ ge|ご go"],
  ["za", "dakuten", "ざ za|じ ji/zi|ず zu|ぜ ze|ぞ zo"],
  ["da", "dakuten", "だ da|ぢ ji/di|づ zu/du|で de|ど do"],
  ["ba", "dakuten", "ば ba|び bi|ぶ bu|べ be|ぼ bo"],
  ["pa", "handakuten", "ぱ pa|ぴ pi|ぷ pu|ぺ pe|ぽ po"],
  ["kya", "combo", "きゃ kya|きゅ kyu|きょ kyo"],
  ["sha", "combo", "しゃ sha/sya|しゅ shu/syu|しょ sho/syo"],
  ["cha", "combo", "ちゃ cha/tya/cya|ちゅ chu/tyu/cyu|ちょ cho/tyo/cyo"],
  ["nya", "combo", "にゃ nya|にゅ nyu|にょ nyo"],
  ["hya", "combo", "ひゃ hya|ひゅ hyu|ひょ hyo"],
  ["mya", "combo", "みゃ mya|みゅ myu|みょ myo"],
  ["rya", "combo", "りゃ rya|りゅ ryu|りょ ryo"],
  ["gya", "combo", "ぎゃ gya|ぎゅ gyu|ぎょ gyo"],
  ["ja", "combo", "じゃ ja/jya/zya|じゅ ju/jyu/zyu|じょ jo/jyo/zyo"],
  ["dya", "combo", "ぢゃ ja/jya/dya|ぢゅ ju/jyu/dyu|ぢょ jo/jyo/dyo"],
  ["bya", "combo", "びゃ bya|びゅ byu|びょ byo"],
  ["pya", "combo", "ぴゃ pya|ぴゅ pyu|ぴょ pyo"],
];

/** Sounds that only exist in katakana, mostly for loanwords. */
const KATAKANA_EXTENDED: [key: string, cells: string][] = [
  ["ext-fv", "ファ fa|フィ fi|フェ fe|フォ fo|ヴァ va|ヴィ vi|ヴ vu|ヴェ ve|ヴォ vo"],
  ["ext-td", "ティ ti/thi|ディ di/dhi|トゥ tu/twu|ドゥ du/dwu|デュ dyu|ウィ wi|ウェ we|イェ ye"],
  ["ext-sh", "シェ she|ジェ je|チェ che|ツァ tsa|ツィ tsi|ツェ tse|ツォ tso"],
];

/**
 * ぢ and づ sound exactly like じ and ず, so both accept the same "ji" and "zu"
 * spellings. The d-row ones are labelled with their d-spelling too, which is
 * also how they're typed on a keyboard, so the two can be told apart.
 */
const D_ROW_TWINS: { d: string; z: string; typed: string; words?: string }[] = [
  { d: "ぢ", z: "じ", typed: "di", words: "はなぢ, ちぢむ" },
  { d: "づ", z: "ず", typed: "du", words: "つづく, みかづき" },
  { d: "ぢゃ", z: "じゃ", typed: "dya" },
  { d: "ぢゅ", z: "じゅ", typed: "dyu" },
  { d: "ぢょ", z: "じょ", typed: "dyo" },
];

function twinDetails(
  kana: string,
  romaji: string[],
  script: "hira" | "kata",
): Pick<RawItem, "romajiLabel" | "note" | "sameSound"> {
  const write = (hiragana: string) => (script === "kata" ? toKatakana(hiragana) : hiragana);
  for (const { d, z, typed, words } of D_ROW_TWINS) {
    if (kana === write(d)) {
      const examples = words && script === "hira" ? ` (${words})` : "";
      return {
        romajiLabel: `${romaji[0]} (${typed})`,
        note: `Sounds the same as ${write(z)}. This d-row spelling is only used in a few words${examples}; type it as “${typed}”.`,
      };
    }
    // A card that only says "ji" can't tell them apart, so it takes either.
    if (kana === write(z)) {
      return {
        sameSound: write(d),
        note: `${write(d)} sounds the same, so either counts for “${romaji[0]}”. ${write(d)} is the rarer d-row spelling, typed “${typed}”.`,
      };
    }
  }
  return {};
}

function parseCells(cells: string): [kana: string, romaji: string[]][] {
  return cells.split("|").map((cell) => {
    const [kana, romaji] = cell.split(" ");
    return [kana, romaji.split("/")];
  });
}

function buildRow(
  script: "hira" | "kata",
  key: string,
  kind: KanaKind,
  cells: [string, string[]][],
): KanaRow {
  const id = `${script}-${key}`;
  const items: RawItem[] = cells.map(([kana, romaji]) => ({
    id: `${script === "hira" ? "h" : "k"}-${kana}`,
    group: id,
    jp: kana,
    reading: kana,
    romaji,
    meaning: [],
    ...twinDetails(kana, romaji, script),
  }));
  return { id, kind, label: cells[0][0], sublabel: cells[0][1][0], items };
}

export const HIRAGANA_ROWS: KanaRow[] = HIRAGANA_TABLE.map(([key, kind, cells]) =>
  buildRow("hira", key, kind, parseCells(cells)),
);

export const KATAKANA_ROWS: KanaRow[] = [
  ...HIRAGANA_TABLE.map(([key, kind, cells]) =>
    buildRow(
      "kata",
      key,
      kind,
      parseCells(cells).map(([kana, romaji]) => [toKatakana(kana), romaji]),
    ),
  ),
  ...KATAKANA_EXTENDED.map(([key, cells]) => buildRow("kata", key, "extended", parseCells(cells))),
];
