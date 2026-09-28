import { describe, expect, it } from "vitest";
import { ITEMS_BY_GROUP } from "@/data/library";
import { breakdown, itemState, proficiency, weakestItems } from "./analytics";
import type { SrsRecord } from "./srs";

const rec = (box: number, seen: number, correct: number, lapses = 0, last = 0): SrsRecord => ({
  box,
  due: 0,
  seen,
  correct,
  lapses,
  last,
});

describe("itemState", () => {
  it("maps SRS boxes to learning stages", () => {
    expect(itemState(undefined)).toBe("new");
    expect(itemState(rec(0, 1, 0))).toBe("learning");
    expect(itemState(rec(1, 1, 1))).toBe("learning");
    expect(itemState(rec(2, 2, 2))).toBe("known");
    expect(itemState(rec(4, 5, 5))).toBe("mastered");
  });
});

describe("breakdown and proficiency", () => {
  it("counts each state and reports the known share", () => {
    const items = ITEMS_BY_GROUP.get("hira-a")!; // あいうえお
    const records = { "h-あ": rec(4, 5, 5), "h-い": rec(2, 2, 2), "h-う": rec(0, 1, 0) };
    const counts = breakdown(items, records);
    expect(counts).toEqual({ total: 5, new: 2, learning: 1, known: 1, mastered: 1 });
    expect(proficiency(counts)).toBeCloseTo(0.4);
  });
});

describe("weakestItems", () => {
  it("orders by accuracy, then misses, and skips unknown ids", () => {
    const records = {
      good: rec(3, 4, 4),
      bad: rec(0, 4, 1, 3),
      worse: rec(0, 4, 0, 4),
      tie: rec(0, 4, 1, 1),
      gone: rec(0, 9, 0, 9),
    };
    const ids = weakestItems(records, 3, (id) => id !== "gone");
    expect(ids).toEqual(["worse", "bad", "tie"]);
  });
});
