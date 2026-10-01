import { describe, expect, it } from "vitest";
import type { SrsRecord } from "@/lib/srs";
import {
  combinedCounts,
  emptyDoc,
  mergeDocs,
  mergeStreaks,
  readDoc,
  sameDoc,
  type DeviceCounts,
  type ProgressDoc,
} from "./progressDoc";

const rec = (last: number, box = 1, seen = 1): SrsRecord => ({ box, due: last + 1000, seen, correct: seen, lapses: 0, last });

function device(history: Record<string, number>): DeviceCounts {
  const h = Object.fromEntries(Object.entries(history).map(([day, n]) => [day, { answered: n, correct: n }]));
  const total = Object.values(history).reduce((a, b) => a + b, 0);
  return { totals: { answered: total, correct: total }, history: h };
}

function doc(parts: Partial<ProgressDoc>): ProgressDoc {
  return { ...emptyDoc(), ...parts };
}

describe("mergeDocs", () => {
  const phone = doc({
    records: { a: rec(100, 3), b: rec(300, 1) },
    devices: { phone: device({ "2026-09-01": 20 }) },
    streak: { count: 1, lastDay: "2026-09-01" },
  });
  const laptop = doc({
    records: { a: rec(200, 1), c: rec(50, 2) },
    devices: { laptop: device({ "2026-09-01": 10, "2026-09-02": 5 }) },
    streak: { count: 2, lastDay: "2026-09-02" },
  });

  it("adds up practice from different devices, even on the same day", () => {
    const merged = mergeDocs(phone, laptop);
    const { totals, history } = combinedCounts(merged.devices);
    expect(totals.answered).toBe(35);
    expect(history["2026-09-01"].answered).toBe(30);
    expect(history["2026-09-02"].answered).toBe(5);
  });

  it("keeps the most recent answer for each item", () => {
    const merged = mergeDocs(phone, laptop);
    expect(merged.records.a.last).toBe(200);
    expect(merged.records.b.last).toBe(300);
    expect(merged.records.c.last).toBe(50);
  });

  it("gives the same result in either order, and merging again changes nothing", () => {
    const ab = mergeDocs(phone, laptop);
    expect(sameDoc(ab, mergeDocs(laptop, phone))).toBe(true);
    expect(sameDoc(mergeDocs(ab, phone), ab)).toBe(true);
    expect(sameDoc(mergeDocs(ab, ab), ab)).toBe(true);
  });

  it("keeps an item unlocked when the other device's later answer was wrong", () => {
    const right: SrsRecord = { box: 1, due: 1100, seen: 1, correct: 1, lapses: 0, last: 100, unlocked: 100 };
    const wrongLater: SrsRecord = { box: 0, due: 900, seen: 1, correct: 0, lapses: 1, last: 900 };
    const a = doc({ records: { w: right } });
    const b = doc({ records: { w: wrongLater } });
    const merged = mergeDocs(a, b);
    expect(merged.records.w).toEqual({ ...wrongLater, unlocked: 100 });
    expect(sameDoc(merged, mergeDocs(b, a))).toBe(true);
    expect(sameDoc(mergeDocs(merged, a), merged)).toBe(true);
    // The unlock survives a trip through the cloud.
    expect(readDoc(JSON.parse(JSON.stringify(merged))).records.w.unlocked).toBe(100);
  });

  it("never double-counts a device's answers when they come back from the cloud", () => {
    const synced = mergeDocs(phone, laptop);
    // The phone answers 5 more on the 1st, then syncs with the cloud copy again.
    const later = doc({ ...synced, devices: { ...synced.devices, phone: device({ "2026-09-01": 25 }) } });
    const merged = mergeDocs(later, synced);
    expect(combinedCounts(merged.devices).history["2026-09-01"].answered).toBe(35);
  });

  it("lets a newer reset wipe older progress, wherever it happened", () => {
    const reset = emptyDoc(1_000);
    expect(mergeDocs(phone, reset)).toBe(reset);
    expect(mergeDocs(reset, laptop)).toBe(reset);
    const afterReset = doc({ resetAt: 1_000, records: { z: rec(2_000) } });
    expect(mergeDocs(afterReset, phone).records).toEqual({ z: rec(2_000) });
  });

  it("carries a streak over from another device", () => {
    expect(mergeDocs(phone, laptop).streak).toEqual({ count: 2, lastDay: "2026-09-02" });
  });
});

describe("mergeStreaks", () => {
  const days = (...list: string[]) => Object.fromEntries(list.map((d) => [d, { answered: 1, correct: 1 }]));

  it("counts consecutive days of practice across devices", () => {
    expect(mergeStreaks([], days("2026-08-30", "2026-09-01", "2026-09-02", "2026-09-03"))).toEqual({
      count: 3,
      lastDay: "2026-09-03",
    });
  });

  it("extends a long streak from before the history began", () => {
    const history = days("2026-09-02", "2026-09-03");
    expect(mergeStreaks([{ count: 40, lastDay: "2026-09-02" }], history)).toEqual({ count: 41, lastDay: "2026-09-03" });
    expect(mergeStreaks([{ count: 40, lastDay: "2026-09-01" }], history)).toEqual({ count: 42, lastDay: "2026-09-03" });
    // A gap breaks it.
    expect(mergeStreaks([{ count: 40, lastDay: "2026-08-30" }], history)).toEqual({ count: 2, lastDay: "2026-09-03" });
  });

  it("works across month and year ends", () => {
    expect(mergeStreaks([], days("2026-12-31", "2027-01-01")).count).toBe(2);
  });
});

describe("readDoc", () => {
  it("drops anything malformed instead of failing", () => {
    expect(readDoc(null)).toEqual(emptyDoc());
    expect(readDoc("nope")).toEqual(emptyDoc());
    const doc = readDoc({
      resetAt: "x",
      records: { a: { box: 2, last: 5 }, b: "bad" },
      devices: { d: { totals: { answered: 3 }, history: { "2026-09-01": { answered: 3, correct: 2 }, junk: {} } } },
      streak: { count: 4, lastDay: 7 },
    });
    expect(doc.resetAt).toBe(0);
    expect(Object.keys(doc.records)).toEqual(["a"]);
    expect(doc.records.a).toMatchObject({ box: 2, last: 5, seen: 0 });
    expect(doc.devices.d.totals).toEqual({ answered: 3, correct: 0 });
    expect(Object.keys(doc.devices.d.history)).toEqual(["2026-09-01"]);
    expect(doc.streak).toEqual({ count: 4, lastDay: null });
  });

  it("round-trips a real document", () => {
    const original = doc({ records: { a: rec(1) }, devices: { d: device({ "2026-09-01": 2 }) }, streak: { count: 1, lastDay: "2026-09-01" } });
    expect(sameDoc(readDoc(JSON.parse(JSON.stringify(original))), original)).toBe(true);
  });
});
