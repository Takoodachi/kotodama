import { describe, expect, it } from "vitest";
import { ITEMS_BY_GROUP, ITEMS_BY_ID, LIBRARY } from "@/data/library";
import { seededRng } from "@/lib/random";
import { supportedDirections } from "./directions";
import { buildOptions } from "./distractors";

describe("buildOptions", () => {
  it("returns four unique options with exactly one correct answer, for every item and direction", () => {
    const rng = seededRng(42);
    for (const item of LIBRARY) {
      for (const direction of supportedDirections(item, "choice")) {
        const options = buildOptions(item, direction, [item], rng);
        const where = `${item.id} ${direction}`;
        expect(options, where).toHaveLength(4);
        expect(options.filter((o) => o.correct), where).toHaveLength(1);
        expect(options.find((o) => o.correct)!.itemId, where).toBe(item.id);
        expect(new Set(options.map((o) => o.label.toLowerCase())).size, where).toBe(4);
      }
    }
    // Every item in the library, so it can outlast the default 5s on a busy machine.
  }, 30_000);

  it("never offers a second item that fits the prompt (じ and ぢ are both 'ji')", () => {
    const ji = ITEMS_BY_ID.get("h-じ")!;
    for (let seed = 0; seed < 50; seed++) {
      const options = buildOptions(ji, "romaji-jp", [ji], seededRng(seed));
      expect(options.map((o) => o.label)).not.toContain("ぢ");
    }
  });

  it("labels ぢ as 'ji (di)' and never offers a spelling it also accepts", () => {
    const di = ITEMS_BY_ID.get("h-ぢ")!;
    for (let seed = 0; seed < 50; seed++) {
      const options = buildOptions(di, "jp-romaji", [di], seededRng(seed));
      expect(options.find((o) => o.correct)!.label).toBe("ji (di)");
      expect(options.map((o) => o.label)).not.toContain("ji");
    }
  });

  it("tests ぢ against じ when the prompt names the d-row", () => {
    const di = ITEMS_BY_ID.get("h-ぢ")!;
    let offered = 0;
    for (let seed = 0; seed < 100; seed++) {
      if (buildOptions(di, "romaji-jp", [di], seededRng(seed)).some((o) => o.label === "じ")) offered++;
    }
    expect(offered).toBeGreaterThan(30);
  });

  it("gives Japanese and romaji options their meaning, but not English options or kana", () => {
    const rng = seededRng(5);
    const taberu = ITEMS_BY_ID.get("v-taberu")!;
    for (const o of buildOptions(taberu, "en-jp", [taberu], rng)) expect(o.meaning, o.label).toBeTruthy();
    for (const o of buildOptions(taberu, "jp-en", [taberu], rng)) expect(o.meaning, o.label).toBeUndefined();
    const sentence = ITEMS_BY_ID.get("s-desu-1")!;
    for (const o of buildOptions(sentence, "jp-romaji", [sentence], rng)) expect(o.meaning, o.label).toBeTruthy();
    const a = ITEMS_BY_ID.get("h-あ")!;
    for (const o of buildOptions(a, "jp-romaji", [a], rng)) expect(o.meaning, o.label).toBeUndefined();
  });

  it("never offers a synonym of the answer as a wrong option", () => {
    const hajimemashite = ITEMS_BY_ID.get("p-hajimemashite")!;
    for (let seed = 0; seed < 100; seed++) {
      const ids = buildOptions(hajimemashite, "jp-en", [hajimemashite], seededRng(seed)).map((o) => o.itemId);
      expect(ids).not.toContain("p-yoroshiku");
    }
  });

  it("writes Japanese options in the chosen scripts", () => {
    const rng = seededRng(3);
    const onlyKana = (text: string) => /^[぀-ゟ゠-ヿ。、！？ー\s]+$/.test(text);
    for (const id of ["v-taberu", "v-koohii", "s-desu-1", "p-kippu"]) {
      const item = ITEMS_BY_ID.get(id)!;
      const hira = buildOptions(item, "en-jp", [item], rng, { writing: ["hiragana"] });
      for (const o of hira) expect(o.label, o.label).toMatch(/^[぀-ゟ。、！？ー\s]+$/);
      const kata = buildOptions(item, "en-jp", [item], rng, { writing: ["katakana"] });
      for (const o of kata) expect(o.label, o.label).toMatch(/^[゠-ヿ。、！？ー\s]+$/);
      const kana = buildOptions(item, "en-jp", [item], rng, { writing: ["hiragana", "katakana"] });
      for (const o of kana) expect(onlyKana(o.label), o.label).toBe(true);
    }
  });

  it("keeps distractors in the same category", () => {
    const rng = seededRng(7);
    const pool = ITEMS_BY_GROUP.get("kata-sa")!;
    for (const item of pool) {
      const options = buildOptions(item, "romaji-jp", pool, rng);
      for (const option of options) expect(ITEMS_BY_ID.get(option.itemId)!.category).toBe("katakana");
    }
  });

  it("favours look-alike characters", () => {
    const shi = ITEMS_BY_ID.get("k-シ")!;
    let lookAlikes = 0;
    for (let seed = 0; seed < 200; seed++) {
      const labels = buildOptions(shi, "romaji-jp", [shi], seededRng(seed)).map((o) => o.label);
      if (labels.some((l) => ["ツ", "ソ", "ン", "ミ", "ジ"].includes(l))) lookAlikes++;
    }
    expect(lookAlikes).toBeGreaterThan(170);
  });
});
