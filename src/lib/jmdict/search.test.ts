import { describe, expect, it } from "vitest";
import { buildDictionary, COMMON_CHUNK, quizMeaning, RARE_CHUNK } from "../../../scripts/dictionary/build.mjs";
import { headword, tagLabel } from "./labels";
import { Dictionary, romajiKeys } from "./search";
import type { DictMeta, JmEntry, SetFile } from "./types";

/**
 * A small dictionary in JMdict's own shape, built the way the real one is and
 * searched the way the app searches it.
 */
type Sense = { pos: string[]; gloss: string[]; misc?: string[] };

const form = (text: string, common: boolean, tags: string[] = []) => ({ text, common, tags, appliesToKanji: ["*"] });
const word = (id: number, kanji: (string | [string, string])[], kana: string[], senses: Sense[], common = true) => ({
  id: String(id),
  kanji: kanji.map((k) => (typeof k === "string" ? form(k, common) : form(k[0], false, [k[1]]))),
  kana: kana.map((k) => form(k, common)),
  sense: senses.map((sense) => ({
    partOfSpeech: sense.pos,
    appliesToKanji: ["*"],
    appliesToKana: ["*"],
    field: [],
    dialect: [],
    misc: sense.misc ?? [],
    info: [],
    gloss: sense.gloss.map((text) => ({ text })),
  })),
});

const EAT = 1358280;
const FOOD = 1358290;
const COFFEE = 1049180;
const DOG = 1258330;
const BUTTON = 1123880;
const PEONY = 1182880;
const THERE = 1000320;
const STUDY = 1512670;
const CHOPSTICKS = 1476410;

/** Kana for a number, so the filler words below sort and search like real ones. */
const kanaNumber = (n: number) => [...String(n).padStart(4, "0")].map((d) => "あいうえおかきくけこ"[Number(d)]).join("");

const WORDS = [
  word(EAT, ["食べる", ["喰べる", "sK"]], ["たべる"], [
    { pos: ["v1", "vt"], gloss: ["to eat"] },
    { pos: ["v1", "vt"], gloss: ["to live on (e.g. a salary)", "to live off"] },
  ]),
  word(FOOD, ["食べ物"], ["たべもの"], [{ pos: ["n"], gloss: ["food"] }]),
  word(2000010, ["食べ歩き"], ["たべあるき"], [{ pos: ["n", "vs"], gloss: ["eating tour"] }], false),
  word(COFFEE, [["珈琲", "sK"]], ["コーヒー"], [{ pos: ["n"], gloss: ["coffee"] }]),
  word(1000001, [], ["アイスクリーム"], [{ pos: ["n"], gloss: ["ice cream"] }]),
  word(1000002, [], ["クリーム"], [
    { pos: ["n"], gloss: ["cream"] },
    { pos: ["n"], gloss: ["ice cream"], misc: ["abbr"] },
  ]),
  word(1000003, [], ["アイスクリームコーン"], [{ pos: ["n"], gloss: ["ice cream cone"] }], false),
  word(1000004, ["かき氷"], ["かきごおり"], [{ pos: ["n"], gloss: ["shaved ice with syrup or cream"] }], false),
  word(DOG, ["犬"], ["いぬ"], [{ pos: ["n"], gloss: ["dog (Canis (lupus) familiaris)", "canine"] }]),
  word(2000020, ["戌"], ["いぬ"], [{ pos: ["n"], gloss: ["the Dog (eleventh sign of the Chinese zodiac)"] }], false),
  word(2000021, ["番犬"], ["ばんけん"], [{ pos: ["n"], gloss: ["watchdog", "guard dog"] }]),
  word(PEONY, ["牡丹"], ["ぼたん", "ボタン"], [{ pos: ["n"], gloss: ["tree peony"], misc: ["uk"] }], false),
  word(BUTTON, ["釦"], ["ボタン"], [{ pos: ["n"], gloss: ["button (clothing)"], misc: ["uk"] }]),
  word(THERE, ["彼処"], ["あそこ", "あすこ"], [{ pos: ["pn"], gloss: ["there", "over there"], misc: ["uk"] }]),
  word(STUDY, ["勉強"], ["べんきょう"], [{ pos: ["n", "vs", "vt"], gloss: ["study"] }]),
  word(2000030, ["橋"], ["はし"], [{ pos: ["n"], gloss: ["bridge"] }]),
  word(CHOPSTICKS, ["箸"], ["はし"], [{ pos: ["n"], gloss: ["chopsticks"] }]),
  word(2000040, [], ["ところで"], [{ pos: ["conj"], gloss: ["by the way", "incidentally"] }]),
  // Enough other words to spread the entries and the indexes over several files.
  ...Array.from({ length: 3000 }, (_, i) =>
    word(3000000 + i, [], [`てすと${kanaNumber(i)}`], [{ pos: ["n"], gloss: [`filler${i} thing`] }], i < 100),
  ),
];

const JLPT = [
  { level: 5, seq: EAT, kana: "たべる", kanji: "食べる", meaning: ["to eat"] },
  { level: 5, seq: FOOD, kana: "たべもの", kanji: "食べ物", meaning: ["food"] },
  { level: 5, seq: DOG, kana: "いぬ", kanji: "犬", meaning: ["dog"] },
  // The list names the peony's entry for "button".
  { level: 5, seq: PEONY, kana: "ボタン", kanji: "", meaning: ["button"] },
  { level: 5, seq: THERE, kana: "あそこ", kanji: "彼処", meaning: ["over there"] },
  { level: 4, seq: STUDY, kana: "べんきょう", kanji: "勉強", meaning: ["study"] },
  // Listed again at a harder level: the easier one stands.
  { level: 3, seq: EAT, kana: "たべる", kanji: "食べる", meaning: ["to eat"] },
  { level: 3, seq: 9999999, kana: "ない", kanji: "無い", meaning: ["gone from the dictionary"] },
];

const CURATED = [
  { id: "v-taberu", category: "vocab" as const, surface: "食べる", reading: "たべる", meaning: ["to eat"] },
  { id: "v-benkyousuru", category: "vocab" as const, surface: "勉強する", reading: "べんきょうする", meaning: ["to study"] },
  { id: "v-hashi", category: "vocab" as const, surface: "はし", reading: "はし", meaning: ["chopsticks"] },
  { id: "p-nagai", category: "phrase" as const, surface: "お元気ですか", reading: "おげんきですか", meaning: ["how are you?"] },
];

const built = buildDictionary(
  { words: WORDS, tags: { n: "noun (common) (futsuumeishi)", pn: "pronoun", abbr: "abbreviation" }, date: "2026-09-28" },
  JLPT,
  CURATED,
  [
    { level: 5, parts: 2 },
    { level: 4, parts: 1 },
  ],
);
const meta = built.files.get("meta.json") as DictMeta;
const fetched: string[] = [];
const dictionary = new Dictionary(meta, async (path) => {
  fetched.push(path);
  const file = built.files.get(`${meta.version}/${path}`);
  if (!file) throw new Error(`no ${path}`);
  return file;
});

const search = async (query: string) => {
  const hits = await dictionary.search(query);
  const entries = await dictionary.entries(hits.map((hit) => hit.at));
  return hits.map((hit, i) => ({ seq: entries[i].s, rank: hit.rank }));
};
const found = async (query: string) => (await search(query)).map((hit) => hit.seq);

describe("the built dictionary", () => {
  it("is named after the release and its word sets, and says what it holds", () => {
    expect(meta.version).toMatch(/^20260928-\d+-[0-9a-z]+$/);
    const other = buildDictionary({ words: WORDS, tags: {}, date: "2026-09-28" }, JLPT, CURATED.slice(1), [{ level: 5, parts: 2 }]);
    expect(other.version).not.toBe(meta.version);
    expect(meta.entries).toBe(WORDS.length);
    expect(meta.chunk).toEqual([COMMON_CHUNK, RARE_CHUNK]);
    // The JLPT words, the other common words, the hundred common fillers.
    expect(meta.common).toBe(113);
  });

  it("puts JLPT words first, easiest level first, then the other common words", async () => {
    const first = await dictionary.entries([0, 1, 2, 3, 4, 5, 6]);
    expect(first.slice(0, 5).every((entry) => entry.j === 5)).toBe(true);
    expect(first[5]).toMatchObject({ s: STUDY, j: 4 });
    expect(first[6].j).toBeUndefined();
    expect(first[6].c).toBe(1);
  });

  it("spreads entries and indexes over several files, and finds each entry in its own", async () => {
    expect(meta.ja.length).toBeGreaterThan(1);
    expect(meta.en.length).toBeGreaterThan(1);
    const edges = [0, COMMON_CHUNK - 1, COMMON_CHUNK, meta.common - 1, meta.common, meta.common + RARE_CHUNK, meta.entries - 1];
    const entries = await dictionary.entries(edges);
    expect(entries.every(Boolean)).toBe(true);
    expect(new Set(entries.map((entry) => entry.s)).size).toBe(edges.length);
    for (const [i, at] of edges.entries()) expect(Boolean(entries[i].c || entries[i].j)).toBe(at < meta.common);
  });

  it("keeps search-only spellings out of the entry, but findable", async () => {
    expect((await found("珈琲"))[0]).toBe(COFFEE);
    const [coffee] = await dictionary.entries([(await dictionary.search("珈琲"))[0].at]);
    expect(coffee.k).toBeUndefined();
    expect(coffee.r).toEqual(["コーヒー"]);
  });

  it("only repeats the part of speech when it changes", async () => {
    const [eat] = await dictionary.entries([(await dictionary.search("食べる"))[0].at]);
    expect(eat.e.map((sense) => sense.p)).toEqual([["v1", "vt"], undefined]);
  });
});

describe("searching in Japanese", () => {
  it("finds a word as written, as read, or in the other kana", async () => {
    for (const query of ["食べる", "たべる", "タベル", " 食べる。"]) expect((await found(query))[0]).toBe(EAT);
  });

  it("lists words that start with what was typed after the exact one, common ones first", async () => {
    expect(await search("食べ")).toEqual([
      { seq: EAT, rank: 3 },
      { seq: FOOD, rank: 3 },
      { seq: 2000010, rank: 3 },
    ]);
    expect((await search("たべる"))[0]).toEqual({ seq: EAT, rank: 0 });
  });

  it("puts the common word first among words read the same", async () => {
    expect((await found("いぬ")).slice(0, 2)).toEqual([DOG, 2000020]);
  });

  it("ignores letters still on their way through an IME", async () => {
    expect((await found("たべr"))[0]).toBe(EAT);
  });

  it("follows a run of words across index files", async () => {
    // てすとああ…: the hundred words numbered 0000 to 0099.
    expect(await found(`てすと${kanaNumber(0).slice(0, 2)}`)).toHaveLength(100);
    expect(await found(`てすと${kanaNumber(2999)}`)).toEqual([3002999]);
  });
});

describe("searching in romaji", () => {
  it("reads romaji as kana, long vowels either way", () => {
    expect(romajiKeys("taberu")).toEqual(["たべる"]);
    expect(romajiKeys("koohii")).toEqual(["こおひい", "こーひー"]);
    expect(romajiKeys("Tōkyō")).toEqual(["とうきょう", "とーきょー"]);
    expect(romajiKeys("eat")).toEqual([]);
    expect(romajiKeys("to eat")).toEqual([]);
  });

  it("finds words by their reading", async () => {
    expect((await found("taberu"))[0]).toBe(EAT);
    expect((await found("koohii"))[0]).toBe(COFFEE);
    expect((await found("tabe")).slice(0, 2)).toEqual([EAT, FOOD]);
  });
});

describe("searching in English", () => {
  it("puts the word whose first meaning it is first", async () => {
    expect((await search("eat"))[0]).toEqual({ seq: EAT, rank: 0 });
    expect((await search("To Eat"))[0]).toEqual({ seq: EAT, rank: 0 });
    expect((await found("study"))[0]).toBe(STUDY);
  });

  it("looks past notes in parentheses, and ranks a whole meaning over a word of one", async () => {
    expect(await search("dog")).toEqual([
      { seq: DOG, rank: 0 },
      { seq: 2000020, rank: 0 },
      { seq: 2000021, rank: 3 },
    ]);
    expect(await found("clothing")).toEqual([]);
  });

  it("counts a longer word that starts with what was typed, a little less", async () => {
    expect(await search("watch")).toEqual([{ seq: 2000021, rank: 5 }]);
  });

  it("finds a phrase as a whole meaning before entries that only have its words", async () => {
    expect(await search("ice cream")).toEqual([
      { seq: 1000001, rank: 0 },
      { seq: 1000002, rank: 2 },
      { seq: 1000003, rank: 3 },
      { seq: 1000004, rank: 5 },
    ]);
  });

  it("finds a phrase made mostly of common words", async () => {
    expect((await search("by the way"))[0]).toEqual({ seq: 2000040, rank: 0 });
  });

  it("finds a word in the last index file, and nothing for nonsense", async () => {
    expect(await found("filler2999")).toEqual([3002999]);
    expect(await found("qqqzz")).toEqual([]);
    expect(await found("  ")).toEqual([]);
  });

  it("reads only a handful of files for a search", async () => {
    fetched.length = 0;
    await dictionary.search("ice cream");
    expect(fetched.length).toBeLessThanOrEqual(4);
    expect(fetched.every((path) => !path.startsWith("e/"))).toBe(true);
  });
});

describe("JLPT word sets", () => {
  const n5 = built.files.get(`${meta.version}/sets/n5.json`) as SetFile;
  const n4 = built.files.get(`${meta.version}/sets/n4.json`) as SetFile;
  const rows = n5.groups.flat();

  it("deal a level's words into parts, each word once", () => {
    expect(n5.level).toBe(5);
    expect(n5.groups).toHaveLength(2);
    expect(rows).toHaveLength(5);
    expect(meta.sets).toEqual({ "dict-n5-1": n5.groups[0].length, "dict-n5-2": n5.groups[1].length, "dict-n4-1": 1 });
    expect(built.files.has(`${meta.version}/sets/n3.json`)).toBe(false);
  });

  it("list a word the app already teaches by its id, and count the rest as new", () => {
    expect(rows).toContain("v-taberu");
    expect(meta.newWords).toBe(5);
    expect(meta.setNewWords["dict-n4-1"]).toBe(1);
  });

  it("give a new word its furigana, meanings and class", () => {
    expect(rows).toContainEqual([FOOD, "{食|た}べ{物|もの}", ["food"], "noun"]);
    expect(rows).toContainEqual([DOG, "{犬|いぬ}", ["dog", "canine"], "noun"]);
    // 勉強する is taught, but that is not the word 勉強 itself.
    expect(n4.groups[0]).toEqual([[STUDY, "{勉強|べんきょう}", ["study"], "noun"]]);
  });

  it("write a word in kana when that is how it is usually written", () => {
    expect(rows).toContainEqual([THERE, "あそこ", ["there", "over there"], "pronoun"]);
  });

  it("take the common entry whose meaning fits when the list names another", () => {
    expect(rows).toContainEqual([BUTTON, "ボタン", ["button (clothing)"], "noun"]);
    expect(rows.some((row) => typeof row !== "string" && row[0] === PEONY)).toBe(false);
    expect(built.report.relisted).toHaveLength(1);
  });
});

describe("the meanings of JLPT words", () => {
  const FAST = 1;
  const MEAT = 2;
  const PEOPLE = 3;
  const FIXED = 4;
  const VERILY = 5;
  const { files, version, report } = buildDictionary(
    {
      words: [
        word(FAST, ["早い"], ["はやい"], [
          { pos: ["adj-i"], gloss: ["fast", "quick"] },
          { pos: ["adj-i"], gloss: ["early (in the day, etc.)", "premature"] },
        ]),
        word(MEAT, ["肉"], ["にく"], [
          { pos: ["n"], gloss: ["flesh"] },
          { pos: ["n"], gloss: ["meat"] },
          { pos: ["n"], gloss: ["the physical body (as opposed to the spirit)"], misc: ["arch"] },
        ]),
        word(PEOPLE, ["民主"], ["みんしゅ"], [
          { pos: ["n"], gloss: ["democracy", "popular sovereignty"] },
          { pos: ["n"], gloss: ["Democratic Party of Japan (1998-2016)"] },
        ]),
        word(FIXED, ["一定"], ["いってい"], [{ pos: ["adj-no"], gloss: ["fixed", "settled"] }]),
        word(VERILY, ["一定"], ["いちじょう"], [{ pos: ["adv"], gloss: ["veritably", "to be sure"] }], false),
      ],
      tags: {},
      date: "2026-09-28",
    },
    [
      { level: 5, seq: FAST, kana: "はやい", kanji: "早い", meaning: ["early"] },
      { level: 5, seq: MEAT, kana: "にく", kanji: "肉", meaning: ["meat"] },
      { level: 5, seq: PEOPLE, kana: "みんしゅ", kanji: "民主", meaning: ["democratic", "the head of the nation"] },
      // The list names the entry read いちじょう for the word read いってい.
      { level: 5, seq: VERILY, kana: "いってい", kanji: "一定", meaning: ["fixed", "definite"] },
    ],
    [],
    [{ level: 5, parts: 1 }],
  );
  const rows = (files.get(`${version}/sets/n5.json`) as SetFile).groups[0];

  it("lead with the sense the list means when the dictionary's first is about something else", () => {
    expect(rows).toContainEqual([FAST, "{早|はや}い", ["early", "premature", "fast"], "i-adj"]);
    // Senses out of everyday use aren't offered as meanings.
    expect(rows).toContainEqual([MEAT, "{肉|にく}", ["meat", "flesh"], "noun"]);
  });

  it("keep the dictionary's first sense when it already agrees with the list", () => {
    expect(rows).toContainEqual([
      PEOPLE,
      "{民主|みんしゅ}",
      ["democracy", "popular sovereignty", "Democratic Party of Japan (1998-2016)"],
      "noun",
    ]);
  });

  it("take the entry read the way the list says", () => {
    expect(rows).toContainEqual([FIXED, "{一定|いってい}", ["fixed", "settled"], "noun"]);
    expect(rows).toHaveLength(4);
    expect(report.relisted).toHaveLength(1);
  });

  it("drop a gloss's longer notes, and keep short ones that complete it", () => {
    expect(quizMeaning("cup (drinking vessel, measure, brassiere, prize, etc.)")).toBe("cup");
    expect(quizMeaning("dog (Canis (lupus) familiaris)")).toBe("dog");
    expect(quizMeaning("door (esp. Japanese-style)")).toBe("door");
    expect(quizMeaning("to close (e.g. book, eyes, meeting, etc.)")).toBe("to close");
    expect(quizMeaning("(hard) candy")).toBe("(hard) candy");
    expect(quizMeaning("to lose (something)")).toBe("to lose (something)");
    expect(quizMeaning("to work (for, at, in)")).toBe("to work (for, at, in)");
    expect(quizMeaning("(e.g. only a note)")).toBe("(e.g. only a note)");
    expect(quizMeaning("thank you")).toBe("thank you");
  });
});

describe("links from the app's own library", () => {
  const links = built.files.get(`${meta.version}/links.json`) as Record<string, number>;

  it("match a word by how it is written and read", () => {
    expect(links["v-taberu"]).toBe(EAT);
  });

  it("tell words written the same in kana apart by their meaning", () => {
    expect(links["v-hashi"]).toBe(CHOPSTICKS);
  });

  it("find a する verb under its noun", () => {
    expect(links["v-benkyousuru"]).toBe(STUDY);
  });

  it("leave out what the dictionary doesn't have", () => {
    expect(links["p-nagai"]).toBeUndefined();
    expect(built.report.unlinked).toEqual(["p-nagai"]);
  });
});

describe("showing an entry", () => {
  const entry = (kanji: string[] | undefined, readings: string[], notes?: string[]): JmEntry => ({
    s: 1,
    ...(kanji && { k: kanji }),
    r: readings,
    e: [{ g: ["x"], ...(notes && { m: notes }) }],
  });

  it("puts the first kanji form on top, with the other forms listed", () => {
    expect(headword(entry(["会う", "逢う"], ["あう"]))).toEqual({
      markup: "{会|あ}う",
      written: "会う",
      reading: "あう",
      others: ["逢う"],
    });
  });

  it("puts the kana on top for a word usually written in kana", () => {
    expect(headword(entry(["彼処"], ["あそこ", "あすこ"], ["uk"]))).toMatchObject({
      markup: "あそこ",
      others: ["彼処", "あすこ"],
    });
    expect(headword(entry(undefined, ["コーヒー"])).markup).toBe("コーヒー");
  });

  it("names JMdict's codes in plain words", () => {
    expect(tagLabel("v5k")).toBe("godan verb");
    expect(tagLabel("adj-i")).toBe("い-adjective");
    expect(tagLabel("n", meta.tags)).toBe("noun");
    expect(tagLabel("food", { food: "food, cooking" })).toBe("food, cooking");
    expect(tagLabel("zzz")).toBe("zzz");
  });
});
