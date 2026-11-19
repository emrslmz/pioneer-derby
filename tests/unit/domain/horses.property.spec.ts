import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { CONDITION_MAX, CONDITION_MIN, HORSE_COUNT } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import { createRng } from '@/domain/random'
import { seedArb } from './arbitraries'

describe('createHorses (properties)', () => {
  it('[X2] for every seed: 20 horses, unique ids, names and colours, condition in range', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const horses = createHorses(createRng(seed))

        expect(horses).toHaveLength(HORSE_COUNT)
        expect(new Set(horses.map((horse) => horse.id)).size).toBe(HORSE_COUNT)
        expect(new Set(horses.map((horse) => horse.name)).size).toBe(HORSE_COUNT)
        expect(new Set(horses.map((horse) => horse.color.key)).size).toBe(HORSE_COUNT)
        for (const { condition } of horses) {
          expect(Number.isInteger(condition)).toBe(true)
          expect(condition).toBeGreaterThanOrEqual(CONDITION_MIN)
          expect(condition).toBeLessThanOrEqual(CONDITION_MAX)
        }
      }),
    )
  })
})
