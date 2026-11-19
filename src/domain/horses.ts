import { CONDITION_MAX, CONDITION_MIN, HORSE_COLORS, HORSE_COUNT, HORSE_NAMES } from './constants'
import { randomInt, shuffle, type Rng } from './random'
import type { Horse } from './types'

/**
 * R2, C1–C3 — creates the 20 horses: ids 1..20, shuffled pioneer names, one unique colour each
 * and a random condition between CONDITION_MIN and CONDITION_MAX.
 */
export function createHorses(rng: Rng): Horse[] {
  const names = shuffle(rng, HORSE_NAMES)
  const colors = shuffle(rng, HORSE_COLORS)

  return Array.from({ length: HORSE_COUNT }, (_, index) => ({
    id: index + 1,
    name: names[index] as string,
    color: colors[index] as Horse['color'],
    condition: randomInt(rng, CONDITION_MIN, CONDITION_MAX),
  }))
}
