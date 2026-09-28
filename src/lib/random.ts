/** A source of floats in [0, 1). `Math.random` in the app, seeded in tests. */
export type Rng = () => number;

/** Mulberry32: tiny, fast and good enough for shuffling quiz cards. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export function randomInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Picks `count` distinct items, each with probability proportional to its
 * weight (Efraimidis–Spirakis A-Res). Items with weight 0 are never picked.
 */
export function weightedSample<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  count: number,
  rng: Rng,
): T[] {
  return items
    .map((item) => {
      const w = weightOf(item);
      return { item, key: w > 0 ? Math.pow(rng(), 1 / w) : -1 };
    })
    .filter((e) => e.key >= 0)
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((e) => e.item);
}
