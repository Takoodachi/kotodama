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
  });

  it("never offers a second item that fits the prompt (じ and ぢ are both 'ji')", () => {
    const ji = ITEMS_BY_ID.get("h-じ")!;
    for (let seed = 0; seed < 50; seed++) {
      const options = buildOptions(ji, "romaji-jp", [ji], seededRng(seed));
      expect(options.map((o) => o.label)).not.toContain("ぢ");
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
