import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/random";
import { cardColumns, packRows } from "./grid";

/** Lays cards out in order the way CSS grid does without back-filling: a card that won't fit starts a new row. */
function rowsOf(widths: number[], columns: number): number[][] {
  const rows: number[][] = [[]];
  let room = columns;
  for (const w of widths) {
    if (w > room) {
      rows.push([]);
      room = columns;
    }
    rows.at(-1)!.push(w);
    room -= w;
  }
  return rows;
}

describe("cardColumns", () => {
  it("widens cards for longer words", () => {
    expect(cardColumns("あ")).toBe(1);
    expect(cardColumns("ともだち")).toBe(2);
    expect(cardColumns("ありがとう")).toBe(2);
    expect(cardColumns("おはようございます")).toBe(3);
  });
});

describe("packRows", () => {
  it("fills the room at the end of a row with the next card that fits", () => {
    const packed = packRows([1, 3, 1, 2, 1], (w) => w, 3);
    expect(packed).toEqual([1, 1, 1, 3, 2]);
  });

  it("keeps every card, and leaves no gap a later card could have filled", () => {
    const rng = seededRng(7);
    for (const columns of [3, 5, 9]) {
      const widths = Array.from({ length: 200 }, () => 1 + Math.floor(rng() * 3));
      const packed = packRows(widths, (w) => w, columns);
      expect([...packed].sort()).toEqual([...widths].sort());

      const rows = rowsOf(packed, columns);
      rows.forEach((row, r) => {
        const room = columns - row.reduce((sum, w) => sum + w, 0);
        const later = rows.slice(r + 1).flat();
        if (later.length) expect(room, `row ${r} with ${columns} columns`).toBeLessThan(Math.min(...later));
      });
    }
  });
});
