import { create } from "zustand";
import { itemsByIds, ITEMS_BY_ID } from "@/data/library";
import type { Direction, Mode } from "@/lib/quiz/directions";
import { makeQuestion, MAX_RETRIES, pickItems, retryIndex, type Question } from "@/lib/quiz/session";
import { useProgress } from "./progress";

export interface AnswerResult {
  questionKey: string;
  itemId: string;
  direction: Direction;
  correct: boolean;
  given: string;
  attempt: number;
}

interface StartOptions {
  itemIds: string[];
  mode: Mode;
  directions: Direction[];
  /** 0 means endless. */
  length: number;
}

interface SessionState {
  status: "idle" | "active" | "done";
  mode: Mode;
  directions: Direction[];
  length: number;
  poolIds: string[];
  queue: Question[];
  index: number;
  results: AnswerResult[];

  start: (options: StartOptions) => boolean;
  answer: (given: string, correct: boolean) => void;
  advance: () => void;
  finish: () => void;
  clear: () => void;
}

const ENDLESS_BATCH = 15;
const rng = Math.random;

function buildQuestions(poolIds: string[], count: number, mode: Mode, directions: Direction[]): Question[] {
  const pool = itemsByIds(poolIds);
  const records = useProgress.getState().records;
  return pickItems(pool, count, records, Date.now(), rng).map((item) =>
    makeQuestion(item, pool, { mode, directions }, rng),
  );
}

/** The live quiz. Kept in memory only: reloading the quiz page returns to the picker. */
export const useSession = create<SessionState>()((set, get) => ({
  status: "idle",
  mode: "choice",
  directions: [],
  length: 0,
  poolIds: [],
  queue: [],
  index: 0,
  results: [],

  start: ({ itemIds, mode, directions, length }) => {
    const poolIds = itemIds.filter((id) => ITEMS_BY_ID.has(id));
    if (!poolIds.length) return false;
    const count = length || ENDLESS_BATCH;
    set({
      status: "active",
      mode,
      directions,
      length,
      poolIds,
      queue: buildQuestions(poolIds, count, mode, directions),
      index: 0,
      results: [],
    });
    return true;
  },

  answer: (given, correct) => {
    const { queue, index, results, poolIds, mode, directions } = get();
    const question = queue[index];
    if (!question || results.at(-1)?.questionKey === question.key) return;

    useProgress.getState().record(question.itemId, correct, question.attempt === 0);

    let nextQueue = queue;
    if (!correct && question.attempt < MAX_RETRIES) {
      const item = ITEMS_BY_ID.get(question.itemId)!;
      const retry = makeQuestion(item, itemsByIds(poolIds), { mode, directions }, rng, question.attempt + 1);
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
          attempt: question.attempt,
        },
      ],
    });
  },

  advance: () => {
    const { index, queue, length, poolIds, mode, directions } = get();
    const next = index + 1;
    if (length === 0 && next + 3 >= queue.length) {
      set({ queue: [...queue, ...buildQuestions(poolIds, ENDLESS_BATCH, mode, directions)], index: next });
      return;
    }
    if (next >= queue.length) set({ status: "done", index: next });
    else set({ index: next });
  },

  finish: () => set({ status: "done" }),
  clear: () => set({ status: "idle", queue: [], results: [], index: 0, poolIds: [] }),
}));

export function currentQuestion(state: Pick<SessionState, "queue" | "index">): Question | undefined {
  return state.queue[state.index];
}
