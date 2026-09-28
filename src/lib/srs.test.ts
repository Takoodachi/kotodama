import { describe, expect, it } from "vitest";
import { BOX_INTERVALS, isDue, mastery, MAX_BOX, priority, review } from "./srs";

const now = 1_000_000_000_000;

describe("review", () => {
  it("moves up a box and schedules further out on a correct answer", () => {
    const first = review(undefined, true, now);
    expect(first.box).toBe(1);
    expect(first.due).toBe(now + BOX_INTERVALS[1]);
    const second = review(first, true, now);
    expect(second.box).toBe(2);
    expect(second.seen).toBe(2);
    expect(second.correct).toBe(2);
  });

  it("caps at the top box", () => {
    let record = review(undefined, true, now);
    for (let i = 0; i < 10; i++) record = review(record, true, now);
    expect(record.box).toBe(MAX_BOX);
  });

  it("drops to box 0 and counts a lapse on a miss", () => {
    let record = review(undefined, true, now);
    record = review(record, true, now);
    record = review(record, false, now);
    expect(record.box).toBe(0);
    expect(record.lapses).toBe(1);
    expect(isDue(record, now)).toBe(true);
  });
});

describe("priority", () => {
  it("ranks missed and due items above learned ones", () => {
    const learned = { box: 5, due: now + 1e9, seen: 8, correct: 8, lapses: 0, last: now };
    const missed = review(review(undefined, true, now), false, now);
    const unseen = undefined;
    expect(priority(missed, now)).toBeGreaterThan(priority(unseen, now));
    expect(priority(unseen, now)).toBeGreaterThan(priority(learned, now));
  });

  it("ranks an item missed often above one missed once", () => {
    const once = { box: 0, due: now, seen: 1, correct: 0, lapses: 1, last: now };
    const often = { ...once, lapses: 4 };
    expect(priority(often, now)).toBeGreaterThan(priority(once, now));
  });
});

describe("mastery", () => {
  it("averages box progress over the given items", () => {
    const records = { a: { box: 5, due: 0, seen: 5, correct: 5, lapses: 0, last: 0 } };
    expect(mastery(["a", "b"], records)).toBeCloseTo(0.5);
    expect(mastery([], records)).toBe(0);
  });
});
