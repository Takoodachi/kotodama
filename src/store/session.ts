import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { itemsByIds, ITEMS_BY_ID } from "@/data/library";
import type { Direction, Mode } from "@/lib/quiz/directions";
import {
  makeQuestion,
  MAX_RETRIES,
  pickItems,
  retryIndex,
  type Question,
  type SessionConfig,
} from "@/lib/quiz/session";
import type { SrsRecord } from "@/lib/srs";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";
import { useProgress } from "./progress";

/** One half of a card answered with both its reading and its meaning. */
export interface AnswerPart {
  given: string;
  correct: boolean;
}

export interface AnswerParts {
  reading: AnswerPart;
  meaning: AnswerPart;
}

export interface AnswerResult {
  questionKey: string;
  itemId: string;
  direction: Direction;
  correct: boolean;
  /** What was typed or picked; for a "both" card, the reading and the meaning together. */
  given: string;
  /** A "both" card's two answers, each checked on its own. */
  parts?: AnswerParts;
  attempt: number;
  /** True when this was the first time the item was ever answered. */
  firstSeen: boolean;
  /** When it was answered (epoch ms). */
  at: number;
  /** The item's record before this answer, so a wrong verdict can be overruled. */
  before?: SrsRecord;
  /** The question queued to ask a missed item again. */
  retryKey?: string;
  /** Marked right by the learner after the check said wrong. */
  overruled?: boolean;
}

/** Ghost mode: a session built from the items answered worst so far. */
export type SessionLabel = "ghost";

interface StartOptions {
  itemIds: string[];
  mode: Mode;
  directions: Direction[];
  /** 0 means endless. */
  length: number;
  label?: SessionLabel;
  writing?: Script[];
}

interface SessionState {
  status: "idle" | "active" | "done";
  mode: Mode;
  directions: Direction[];
  length: number;
  label: SessionLabel | null;
  writing: Script[];
  poolIds: string[];
  queue: Question[];
  index: number;
  results: AnswerResult[];

  start: (options: StartOptions) => boolean;
  answer: (given: string, correct: boolean, parts?: AnswerParts) => void;
  /**
   * Counts the last answer as right after all: for an English answer put in
   * words the check didn't recognise. The item's progress is recorded again
   * as right, and its retry is taken out of the queue.
   */
  overrule: () => void;
  advance: () => void;
  finish: () => void;
  clear: () => void;
}

const ENDLESS_BATCH = 15;
const rng = Math.random;

function buildQuestions(poolIds: string[], count: number, config: SessionConfig): Question[] {
  const pool = itemsByIds(poolIds);
  const records = useProgress.getState().records;
  return pickItems(pool, count, records, Date.now(), rng).map((item) => makeQuestion(item, pool, config, rng));
}

/**
 * The live quiz. Saved to sessionStorage (this tab only), so a reload, or an
 * offline navigation that falls back to a full page load, resumes the session.
 */
export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      status: "idle",
      mode: "choice",
      directions: [],
      length: 0,
      label: null,
      writing: ALL_SCRIPTS,
      poolIds: [],
      queue: [],
      index: 0,
      results: [],

      start: ({ itemIds, mode, directions, length, label, writing = ALL_SCRIPTS }) => {
        const poolIds = itemIds.filter((id) => ITEMS_BY_ID.has(id));
        if (!poolIds.length) return false;
        const count = length || ENDLESS_BATCH;
        set({
          status: "active",
          mode,
          directions,
          length,
          label: label ?? null,
          writing,
          poolIds,
          queue: buildQuestions(poolIds, count, { mode, directions, writing }),
          index: 0,
          results: [],
        });
        return true;
      },

      answer: (given, correct, parts) => {
        const { queue, index, results, poolIds, mode, directions, writing } = get();
        const question = queue[index];
        if (!question || results.at(-1)?.questionKey === question.key) return;

        const before = useProgress.getState().records[question.itemId];
        useProgress.getState().record(question.itemId, correct, question.attempt === 0);

        let nextQueue = queue;
        let retryKey: string | undefined;
        if (!correct && question.attempt < MAX_RETRIES) {
          const item = ITEMS_BY_ID.get(question.itemId)!;
          const retry = makeQuestion(item, itemsByIds(poolIds), { mode, directions, writing }, rng, question.attempt + 1);
          retryKey = retry.key;
          nextQueue = [...queue];
          nextQueue.splice(retryIndex(index, queue.length, rng), 0, retry);
        }

        set({
          queue: nextQueue,
          results: [
            ...results,
            {
              questionKey: question.key,
              itemId: question.itemId,
              direction: question.direction,
              correct,
              given,
              parts,
              attempt: question.attempt,
              firstSeen: !before,
              at: Date.now(),
              before,
              retryKey,
            },
          ],
        });
      },

      overrule: () => {
        const { queue, index, results } = get();
        const last = results.at(-1);
        if (!last || last.correct || last.questionKey !== queue[index]?.key) return;
        // Sessions saved before answers carried a time fall back to now.
        useProgress.getState().amend(last.itemId, last.before, last.attempt === 0, last.at || Date.now());
        // Only the meaning is ever overruled: a reading is checked exactly.
        const parts = last.parts && { ...last.parts, meaning: { ...last.parts.meaning, correct: true } };
        set({
          queue: queue.filter((q) => q.key !== last.retryKey),
          results: [...results.slice(0, -1), { ...last, correct: true, parts, overruled: true }],
        });
      },

      advance: () => {
        const { index, queue, length, poolIds, mode, directions, writing } = get();
        const next = index + 1;
        if (length === 0 && next + 3 >= queue.length) {
          set({ queue: [...queue, ...buildQuestions(poolIds, ENDLESS_BATCH, { mode, directions, writing })], index: next });
          return;
        }
        if (next >= queue.length) set({ status: "done", index: next });
        else set({ index: next });
      },

      finish: () => set({ status: "done" }),
      clear: () =>
        set({ status: "idle", queue: [], results: [], index: 0, poolIds: [], label: null, writing: ALL_SCRIPTS }),
    }),
    {
      name: "kotodama-session",
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
    },
  ),
);

export function currentQuestion(state: Pick<SessionState, "queue" | "index">): Question | undefined {
  return state.queue[state.index];
}
