import { isUnlocked, unlockedAt, type SrsRecord } from "@/lib/srs";

/**
 * Progress as it is saved to an account: one document that every device
 * merges into. Merging never loses practice from either side and gives the
 * same result in any order, so devices can sync whenever they like, even
 * after days offline.
 */

export interface Counts {
  answered: number;
  correct: number;
}

export interface Streak {
  count: number;
  /** Local date (YYYY-MM-DD) of the last practice. */
  lastDay: string | null;
}

/**
 * One device's own answer counts. Each device only ever adds to its own, so
 * merging takes the larger value, and the totals are the sum over devices:
 * practice on a phone and a laptop on the same day adds up.
 */
export interface DeviceCounts {
  totals: Counts;
  /** Answers per local day (YYYY-MM-DD). */
  history: Record<string, Counts>;
}

export interface ProgressDoc {
  v: 1;
  /** When progress was last reset (epoch ms, 0 if never). A newer reset wins outright. */
  resetAt: number;
  records: Record<string, SrsRecord>;
  streak: Streak;
  devices: Record<string, DeviceCounts>;
}

const ZERO: Counts = { answered: 0, correct: 0 };

export function emptyDoc(resetAt = 0): ProgressDoc {
  return { v: 1, resetAt, records: {}, streak: { count: 0, lastDay: null }, devices: {} };
}

// ---------------------------------------------------------------- dates

export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dayNumber = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Whole days from `a` to `b` (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round(dayNumber(b) - dayNumber(a));
}

// ---------------------------------------------------------------- merging

const maxCounts = (a: Counts = ZERO, b: Counts = ZERO): Counts => ({
  answered: Math.max(a.answered, b.answered),
  correct: Math.max(a.correct, b.correct),
});

function mergeDevice(a: DeviceCounts | undefined, b: DeviceCounts | undefined): DeviceCounts {
  if (!a) return b!;
  if (!b) return a;
  const history: Record<string, Counts> = { ...a.history };
  for (const [day, counts] of Object.entries(b.history)) history[day] = maxCounts(history[day], counts);
  return { totals: maxCounts(a.totals, b.totals), history };
}

/** The more recent of two records for the same item; ties are broken the same way in either order. */
function newerRecord(a: SrsRecord, b: SrsRecord): SrsRecord {
  for (const key of ["last", "seen", "box", "due", "correct", "lapses"] as const) {
    if (a[key] !== b[key]) return a[key] > b[key] ? a : b;
  }
  return a;
}

/**
 * Two devices' records for one item. The more recent one wins, but an item
 * unlocked on either device stays unlocked, from the earliest time known.
 */
function mergeRecords(a: SrsRecord, b: SrsRecord): SrsRecord {
  const newer = newerRecord(a, b);
  const times = [a, b].filter(isUnlocked).map(unlockedAt);
  if (!times.length) return newer;
  const unlocked = Math.min(...times);
  return isUnlocked(newer) && unlockedAt(newer) === unlocked ? newer : { ...newer, unlocked };
}

/** All devices' counts added together, as shown in stats and the heatmap. */
export function combinedCounts(devices: Record<string, DeviceCounts>): { totals: Counts; history: Record<string, Counts> } {
  const totals = { answered: 0, correct: 0 };
  const history: Record<string, Counts> = {};
  for (const device of Object.values(devices)) {
    totals.answered += device.totals.answered;
    totals.correct += device.totals.correct;
    for (const [day, counts] of Object.entries(device.history)) {
      const sum = history[day] ?? { answered: 0, correct: 0 };
      history[day] = { answered: sum.answered + counts.answered, correct: sum.correct + counts.correct };
    }
  }
  return { totals, history };
}

const isLater = (a: Streak, b: Streak) =>
  !b.lastDay || (!!a.lastDay && (a.lastDay > b.lastDay || (a.lastDay === b.lastDay && a.count > b.count)));

/**
 * The streak across devices. The practice history shows which days had any
 * practice; a streak saved on one device (which may reach back before the
 * history began) is extended by the days practiced after it elsewhere.
 */
export function mergeStreaks(streaks: Streak[], history: Record<string, Counts>): Streak {
  const days = Object.keys(history)
    .filter((day) => history[day].answered > 0)
    .sort();
  let best: Streak = { count: 0, lastDay: null };
  let runStart: string | null = null;
  const runEnd = days.at(-1) ?? null;
  if (runEnd) {
    let count = 1;
    for (let i = days.length - 2; i >= 0 && daysBetween(days[i], days[i + 1]) === 1; i--) count++;
    runStart = days[days.length - count];
    best = { count, lastDay: runEnd };
  }
  for (const streak of streaks) {
    if (!streak.lastDay || streak.count <= 0) continue;
    let candidate = streak;
    // A streak ending inside the latest run, or the day before it, carries on to the run's end.
    if (runStart && runEnd && daysBetween(runStart, streak.lastDay) >= -1 && streak.lastDay <= runEnd) {
      candidate = { count: streak.count + daysBetween(streak.lastDay, runEnd), lastDay: runEnd };
    }
    if (isLater(candidate, best)) best = candidate;
  }
  return best;
}

/** Combines two versions of an account's progress. Order doesn't matter, and merging twice changes nothing. */
export function mergeDocs(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  // A reset on any device clears everything that happened before it.
  if (a.resetAt !== b.resetAt) return a.resetAt > b.resetAt ? a : b;

  const records: Record<string, SrsRecord> = { ...a.records };
  for (const [id, record] of Object.entries(b.records)) {
    records[id] = records[id] ? mergeRecords(records[id], record) : record;
  }

  const devices: Record<string, DeviceCounts> = {};
  for (const id of new Set([...Object.keys(a.devices), ...Object.keys(b.devices)])) {
    devices[id] = mergeDevice(a.devices[id], b.devices[id]);
  }

  const streak = mergeStreaks([a.streak, b.streak], combinedCounts(devices).history);
  return { v: 1, resetAt: a.resetAt, records, streak, devices };
}

// ---------------------------------------------------------------- checking

/** JSON with object keys sorted, so equal documents give equal strings. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameDoc(a: ProgressDoc, b: ProgressDoc): boolean {
  return stableStringify(a) === stableStringify(b);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

function readCounts(value: unknown): Counts {
  return isObject(value) ? { answered: num(value.answered), correct: num(value.correct) } : { ...ZERO };
}

/**
 * Reads a document from the cloud defensively: anything malformed is dropped
 * rather than breaking the app.
 */
export function readDoc(value: unknown): ProgressDoc {
  if (!isObject(value)) return emptyDoc();
  const records: Record<string, SrsRecord> = {};
  if (isObject(value.records)) {
    for (const [id, r] of Object.entries(value.records)) {
      if (!isObject(r)) continue;
      records[id] = {
        box: num(r.box),
        due: num(r.due),
        seen: num(r.seen),
        correct: num(r.correct),
        lapses: num(r.lapses),
        last: num(r.last),
        ...(num(r.unlocked) > 0 && { unlocked: num(r.unlocked) }),
      };
    }
  }
  const devices: Record<string, DeviceCounts> = {};
  if (isObject(value.devices)) {
    for (const [id, d] of Object.entries(value.devices)) {
      if (!isObject(d)) continue;
      const history: Record<string, Counts> = {};
      if (isObject(d.history)) {
        for (const [day, counts] of Object.entries(d.history)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(day)) history[day] = readCounts(counts);
        }
      }
      devices[id] = { totals: readCounts(d.totals), history };
    }
  }
  const streak = isObject(value.streak) ? value.streak : {};
  return {
    v: 1,
    resetAt: num(value.resetAt),
    records,
    streak: {
      count: num(streak.count),
      lastDay: typeof streak.lastDay === "string" ? streak.lastDay : null,
    },
    devices,
  };
}
