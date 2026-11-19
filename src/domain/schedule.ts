import { HORSES_PER_ROUND, ROUND_DISTANCES } from './constants'
import { sample, type Rng } from './random'
import type { Horse, Round } from './types'

/**
 * R3, C4–C6 — builds the race program: one round per distance, each with HORSES_PER_ROUND
 * distinct horses sampled independently from all horses (a horse may run in several rounds, A3).
 */
export function createSchedule(horses: readonly Horse[], rng: Rng): Round[] {
  if (horses.length < HORSES_PER_ROUND) {
    throw new RangeError(
      `createSchedule: need at least ${HORSES_PER_ROUND} horses, got ${horses.length}`,
    )
  }
  const ids = horses.map((horse) => horse.id)

  return ROUND_DISTANCES.map((distance, index) => ({
    index,
    distance,
    horseIds: sample(rng, ids, HORSES_PER_ROUND),
  }))
}
