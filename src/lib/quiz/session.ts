import type { StudyItem } from "@/data/types";
import { randomInt, weightedSample, type Rng } from "@/lib/random";
import { priority, type SrsRecord } from "@/lib/srs";
import { pickDirection, type Direction, type Mode } from "./directions";
import { buildOptions, type ChoiceOption } from "./distractors";

export interface Question {
  /** Unique within a session; the same item can appear more than once. */
  key: string;
  itemId: string;
  direction: Direction;
  /** Multiple-choice options, null for typed modes. */
  options: ChoiceOption[] | null;
  /** 0 for the first time an item is asked, 1+ when re-asked after a miss. */
  attempt: number;
}

export interface SessionConfig {
  mode: Mode;
  directions: readonly Direction[];
}

/** How many times a missed item is re-asked within one session. */
export const MAX_RETRIES = 2;

let questionCounter = 0;

export function makeQuestion(
  item: StudyItem,
  pool: readonly StudyItem[],
  config: SessionConfig,
  rng: Rng,
  attempt = 0,
): Question {
  const direction = pickDirection(item, config.mode, config.directions, rng);
  return {
    key: `${item.id}#${++questionCounter}`,
    itemId: item.id,
    direction,
    options: config.mode === "choice" ? buildOptions(item, direction, pool, rng) : null,
    attempt,
  };
}

/**
 * Picks `count` items for a session, weighted by spaced-repetition priority, so
 * due and often-missed items come up more. When the pool is smaller than
 * `count` it is cycled, never showing the same item twice in a row.
 */
export function pickItems(
  pool: readonly StudyItem[],
  count: number,
  records: Record<string, SrsRecord>,
  now: number,
  rng: Rng,
): StudyItem[] {
  const picked: StudyItem[] = [];
  while (picked.length < count && pool.length > 0) {
    const round = weightedSample(pool, (item) => priority(records[item.id], now), count - picked.length, rng);
    if (round.length > 1 && picked.length && round[0].id === picked[picked.length - 1].id) {
      round.push(round.shift()!);
    }
    picked.push(...round);
  }
  return picked;
}

/** Where a missed question goes back into the queue: 3–6 cards later. */
export function retryIndex(currentIndex: number, queueLength: number, rng: Rng): number {
  return Math.min(queueLength, currentIndex + randomInt(3, 6, rng));
}
