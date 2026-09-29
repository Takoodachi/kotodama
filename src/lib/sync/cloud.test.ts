import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { syncProgress } from "./cloud";
import { combinedCounts, emptyDoc, type ProgressDoc } from "./progressDoc";

interface Row {
  user_id: string;
  data: unknown;
  version: number;
}

/**
 * Just enough of the Supabase query builder for syncProgress, backed by an
 * in-memory table. `beforeWrite` runs between a read and the next write, to
 * play another device saving at the same moment.
 */
function fakeClient(rows: Map<string, Row>, beforeWrite?: () => void) {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
  const table = {
    select: () => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: (column: string, value: unknown) => ((filters[column] = value), chain),
        retry: () => chain,
        maybeSingle: async () => {
          const row = rows.get(filters.user_id as string);
          return { data: row ? clone({ data: row.data, version: row.version }) : null, error: null };
        },
      };
      return chain;
    },
    insert: async (row: Row) => {
      beforeWrite?.();
      if (rows.has(row.user_id)) return { error: { code: "23505", message: "duplicate key" } };
      rows.set(row.user_id, clone(row));
      return { error: null };
    },
    update: (values: Partial<Row>) => {
      const filters: Record<string, unknown> = {};
      const chain = {
        eq: (column: string, value: unknown) => ((filters[column] = value), chain),
        select: async () => {
          beforeWrite?.();
          const row = rows.get(filters.user_id as string);
          if (!row || row.version !== filters.version) return { data: [], error: null };
          Object.assign(row, clone(values));
          return { data: [{ version: row.version }], error: null };
        },
      };
      return chain;
    },
  };
  return { from: () => table } as unknown as SupabaseClient;
}

function practiced(deviceId: string, answered: number): ProgressDoc {
  const counts = { answered, correct: answered };
  return {
    ...emptyDoc(),
    streak: { count: 1, lastDay: "2026-09-01" },
    records: { [`item-${deviceId}`]: { box: 1, due: 0, seen: 1, correct: 1, lapses: 0, last: answered } },
    devices: { [deviceId]: { totals: counts, history: { "2026-09-01": counts } } },
  };
}

const answeredIn = (doc: unknown) => combinedCounts((doc as ProgressDoc).devices).totals.answered;

describe("syncProgress", () => {
  it("creates the account's row on the first sync", async () => {
    const rows = new Map<string, Row>();
    const merged = await syncProgress(fakeClient(rows), "u1", practiced("phone", 5));
    expect(rows.get("u1")?.version).toBe(1);
    expect(answeredIn(rows.get("u1")!.data)).toBe(5);
    expect(answeredIn(merged)).toBe(5);
  });

  it("merges with what other devices saved and bumps the version", async () => {
    const rows = new Map<string, Row>([["u1", { user_id: "u1", data: practiced("laptop", 7), version: 3 }]]);
    const merged = await syncProgress(fakeClient(rows), "u1", practiced("phone", 5));
    expect(answeredIn(merged)).toBe(12);
    expect(rows.get("u1")).toMatchObject({ version: 4 });
    expect(answeredIn(rows.get("u1")!.data)).toBe(12);
  });

  it("doesn't write when nothing is new", async () => {
    const rows = new Map<string, Row>([["u1", { user_id: "u1", data: practiced("laptop", 7), version: 3 }]]);
    await syncProgress(fakeClient(rows), "u1", emptyDoc());
    expect(rows.get("u1")?.version).toBe(3);
  });

  it("merges again when another device saves in between, so neither loses practice", async () => {
    const rows = new Map<string, Row>([["u1", { user_id: "u1", data: practiced("laptop", 7), version: 1 }]]);
    let raced = false;
    const client = fakeClient(rows, () => {
      if (raced) return;
      raced = true;
      // The tablet saves between our read and our write.
      rows.set("u1", { user_id: "u1", data: { ...practiced("laptop", 7), devices: { ...practiced("laptop", 7).devices, ...practiced("tablet", 3).devices } }, version: 2 });
    });
    const merged = await syncProgress(client, "u1", practiced("phone", 5));
    expect(answeredIn(merged)).toBe(15);
    expect(rows.get("u1")?.version).toBe(3);
    expect(answeredIn(rows.get("u1")!.data)).toBe(15);
  });

  it("handles two devices creating the row at once", async () => {
    const rows = new Map<string, Row>();
    let raced = false;
    const client = fakeClient(rows, () => {
      if (raced) return;
      raced = true;
      rows.set("u1", { user_id: "u1", data: practiced("laptop", 7), version: 1 });
    });
    const merged = await syncProgress(client, "u1", practiced("phone", 5));
    expect(answeredIn(merged)).toBe(12);
    expect(rows.get("u1")?.version).toBe(2);
  });
});
