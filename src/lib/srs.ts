/**
 * Leitner-style spaced repetition. Each item sits in a box from 0 to 5. A
 * correct answer moves it up a box and pushes its next review further out. A
 * miss sends it back to box 0. Items that are due, unseen, low-boxed or often
 * missed get a higher weight when a session picks its cards.
 */
export interface SrsRecord {
  box: number;
  /** Epoch ms when the item is next due. */
  due: number;
  seen: number;
  correct: number;
  lapses: number;
  /** Epoch ms of the last answer. */
  last: number;
  /**
   * Epoch ms of the first right answer, on any attempt: what puts a word in
   * the learner's dictionary. Records from before this was kept don't have
   * it; see `isUnlocked`.
   */
  unlocked?: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const MAX_BOX = 5;
export const BOX_INTERVALS = [0, 10 * MINUTE, DAY, 3 * DAY, 7 * DAY, 21 * DAY];
export const MASTERED_BOX = 4;

export function review(record: SrsRecord | undefined, correct: boolean, now: number): SrsRecord {
  const prev = record ?? { box: 0, due: now, seen: 0, correct: 0, lapses: 0, last: now };
  const box = correct ? Math.min(MAX_BOX, prev.box + 1) : 0;
  return {
    box,
    due: now + BOX_INTERVALS[box],
    seen: prev.seen + 1,
    correct: prev.correct + (correct ? 1 : 0),
    lapses: prev.lapses + (correct ? 0 : 1),
    last: now,
    ...(isUnlocked(prev) ? { unlocked: unlockedAt(prev) } : correct ? { unlocked: now } : {}),
  };
}

/** Whether the item has ever been answered right: it is then in the learner's dictionary. */
export function isUnlocked(record: SrsRecord | undefined): boolean {
  return !!record && (record.unlocked !== undefined || record.correct > 0);
}

/** When the item was unlocked; older records only know it was by their last answer. */
export function unlockedAt(record: SrsRecord): number {
  return record.unlocked ?? record.last;
}

/** Marks an item unlocked by a right answer that doesn't otherwise count, like a retry within a session. */
export function unlock(record: SrsRecord, now: number): SrsRecord {
  return isUnlocked(record) ? record : { ...record, unlocked: now };
}

/** Relative weight for picking an item into a session. Higher means sooner. */
export function priority(record: SrsRecord | undefined, now: number): number {
  if (!record) return 3;
  const boxWeight = MAX_BOX + 1 - record.box;
  const dueWeight = record.due <= now ? 2 : 0.6;
  const lapseWeight = 1 + Math.min(record.lapses, 4) * 0.35;
  return boxWeight * dueWeight * lapseWeight;
}

export function isDue(record: SrsRecord | undefined, now: number): boolean {
  return !!record && record.box < MAX_BOX && record.due <= now;
}

export function isMastered(record: SrsRecord | undefined): boolean {
  return !!record && record.box >= MASTERED_BOX;
}

export function isWeak(record: SrsRecord | undefined): boolean {
  return !!record && record.lapses > 0 && record.box <= 2;
}

/** Share of the given items' possible progress that has been reached, 0–1. */
export function mastery(ids: readonly string[], records: Record<string, SrsRecord>): number {
  if (!ids.length) return 0;
  let total = 0;
  for (const id of ids) total += (records[id]?.box ?? 0) / MAX_BOX;
  return total / ids.length;
}
