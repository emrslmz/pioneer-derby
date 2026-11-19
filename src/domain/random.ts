/**
 * Seeded randomness. Every random decision in the game goes through an `Rng` created here,
 * so the same seed always replays the same game (X11) and tests are deterministic.
 */

/** Returns a float in [0, 1). */
export type Rng = () => number

const UINT32 = 0x1_0000_0000

/** Normalises any number into a uint32 seed. */
export function toSeed(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) >>> 0 : 0
}

/** mulberry32 — tiny, fast, good enough statistical quality for a game. */
export function createRng(seed: number): Rng {
  let state = toSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / UINT32
  }
}

/**
 * Derives an independent seed for one concern (horses, schedule, round 3 …) from the game seed.
 * Each concern gets its own stream, so e.g. replaying round 4 does not depend on rounds 1–3.
 */
export function deriveSeed(seed: number, ...parts: readonly number[]): number {
  let hash = toSeed(seed) ^ 0x811c9dc5
  for (const part of parts) {
    hash = Math.imul(hash ^ toSeed(part), 0x01000193)
    hash ^= hash >>> 13
  }
  return hash >>> 0
}

/** Float in [min, max). */
export function randomFloat(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/** Integer in [min, max], both inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`randomInt: invalid range [${min}, ${max}]`)
  }
  return min + Math.floor(rng() * (max - min + 1))
}

/** Fisher–Yates shuffle. Returns a new array; the input is not modified. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}

/** `count` distinct items picked at random, in random order. */
export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  if (!Number.isInteger(count) || count < 0 || count > items.length) {
    throw new RangeError(`sample: cannot pick ${count} of ${items.length} items`)
  }
  return shuffle(rng, items).slice(0, count)
}
