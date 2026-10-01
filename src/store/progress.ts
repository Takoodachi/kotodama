import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { review, unlock, type SrsRecord } from "@/lib/srs";
import {
  combinedCounts,
  emptyDoc,
  localDay,
  mergeDocs,
  type Counts,
  type DeviceCounts,
  type ProgressDoc,
  type Streak,
} from "@/lib/sync/progressDoc";

export { localDay };
export type DayActivity = Counts;

interface ProgressState {
  records: Record<string, SrsRecord>;
  streak: Streak;
  /** Answers on every device, added up. */
  totals: Counts;
  /** Answers per local day (YYYY-MM-DD) on every device, for the study heatmap. */
  history: Record<string, DayActivity>;

  /** This device's id among the account's devices. */
  deviceId: string;
  /** Each device's own counts, which `totals` and `history` add up. */
  devices: Record<string, DeviceCounts>;
  /** When progress was last reset everywhere (epoch ms, 0 if never). */
  resetAt: number;
  /** Account this progress was last synced with, so it never leaks into another account. */
  syncedWith: string | null;

  /**
   * Records an answer. Only first attempts move an item between SRS boxes; a
   * right answer on a retry still unlocks the item for the dictionary.
   */
  record: (itemId: string, correct: boolean, firstAttempt: boolean) => void;
  /**
   * Turns an answer recorded as wrong into a right one: the item's record is
   * redone from `before`, and one more right answer is counted on the day it
   * was given (`at`). Counts only grow, so this syncs like any answer.
   */
  amend: (itemId: string, before: SrsRecord | undefined, firstAttempt: boolean, at: number) => void;
  /** Erases progress on every device of the account (on the next sync). */
  reset: () => void;
  /** Forgets progress on this device only, e.g. when signing out. */
  clearLocal: () => void;
  /** Merges in progress from the account. */
  mergeDoc: (doc: ProgressDoc, syncedWith: string) => void;
}

function nextStreak(streak: Streak, now: Date): Streak {
  const today = localDay(now);
  if (streak.lastDay === today) return streak;
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return { count: streak.lastDay === yesterday ? streak.count + 1 : 1, lastDay: today };
}

/** The streak as it stands today: it lapses if yesterday was skipped. */
export function currentStreak(streak: Streak, now = new Date()): number {
  if (!streak.lastDay) return 0;
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return streak.lastDay === today || streak.lastDay === yesterday ? streak.count : 0;
}

function newDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 13);
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-5);
}

const addTo = (counts: Counts | undefined, correct: boolean): Counts => ({
  answered: (counts?.answered ?? 0) + 1,
  correct: (counts?.correct ?? 0) + (correct ? 1 : 0),
});

/** Progress as a document to sync with the account. */
export function progressDoc(state: Pick<ProgressState, "resetAt" | "records" | "streak" | "devices">): ProgressDoc {
  return { v: 1, resetAt: state.resetAt, records: state.records, streak: state.streak, devices: state.devices };
}

function fromDoc(doc: ProgressDoc) {
  return { records: doc.records, streak: doc.streak, devices: doc.devices, resetAt: doc.resetAt, ...combinedCounts(doc.devices) };
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      ...fromDoc(emptyDoc()),
      deviceId: newDeviceId(),
      syncedWith: null,

      record: (itemId, correct, firstAttempt) =>
        set((s) => {
          const now = new Date();
          const day = localDay(now);
          const own = s.devices[s.deviceId] ?? { totals: { answered: 0, correct: 0 }, history: {} };
          const before = s.records[itemId];
          const record = firstAttempt
            ? review(before, correct, now.getTime())
            : before && correct
              ? unlock(before, now.getTime())
              : before;
          return {
            records: record && record !== before ? { ...s.records, [itemId]: record } : s.records,
            streak: nextStreak(s.streak, now),
            totals: addTo(s.totals, correct),
            history: { ...s.history, [day]: addTo(s.history[day], correct) },
            devices: {
              ...s.devices,
              [s.deviceId]: {
                totals: addTo(own.totals, correct),
                history: { ...own.history, [day]: addTo(own.history[day], correct) },
              },
            },
          };
        }),
      amend: (itemId, before, firstAttempt, at) =>
        set((s) => {
          const day = localDay(new Date(at));
          const own = s.devices[s.deviceId] ?? { totals: { answered: 0, correct: 0 }, history: {} };
          const oneMoreRight = (counts?: Counts): Counts => ({
            answered: counts?.answered ?? 0,
            correct: (counts?.correct ?? 0) + 1,
          });
          // A retry doesn't move the item between boxes, but being right still unlocks it.
          const current = s.records[itemId];
          const record = firstAttempt ? review(before, true, Date.now()) : current && unlock(current, Date.now());
          return {
            records: record && record !== current ? { ...s.records, [itemId]: record } : s.records,
            totals: oneMoreRight(s.totals),
            history: { ...s.history, [day]: oneMoreRight(s.history[day]) },
            devices: {
              ...s.devices,
              [s.deviceId]: {
                totals: oneMoreRight(own.totals),
                history: { ...own.history, [day]: oneMoreRight(own.history[day]) },
              },
            },
          };
        }),
      reset: () => set(fromDoc(emptyDoc(Date.now()))),
      clearLocal: () => set({ ...fromDoc(emptyDoc()), syncedWith: null }),
      mergeDoc: (doc, syncedWith) =>
        set((s) => {
          // Progress synced with another account is replaced, never merged.
          const local = s.syncedWith && s.syncedWith !== syncedWith ? emptyDoc() : progressDoc(s);
          return { ...fromDoc(mergeDocs(local, doc)), syncedWith };
        }),
    }),
    {
      name: "kotodama-progress",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        let state = persisted as Partial<ProgressState>;
        // v1 had no daily history; start it empty rather than invent past activity.
        if (version < 2) state = { ...state, history: {} };
        // v3 keeps each device's counts apart, so they add up across devices.
        if (version < 3) {
          const deviceId = newDeviceId();
          state = {
            ...state,
            deviceId,
            resetAt: 0,
            syncedWith: null,
            devices: {
              [deviceId]: { totals: state.totals ?? { answered: 0, correct: 0 }, history: state.history ?? {} },
            },
          };
        }
        return state as ProgressState;
      },
    },
  ),
);
