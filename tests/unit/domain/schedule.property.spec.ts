import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { HORSES_PER_ROUND, ROUND_DISTANCES } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import { createRng, deriveSeed } from '@/domain/random'
import { createSchedule } from '@/domain/schedule'
import { seedArb } from './arbitraries'

describe('createSchedule (properties)', () => {
  it('[X2] for every seed: 6 rounds, correct distances, 10 distinct known horses each', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const horses = createHorses(createRng(deriveSeed(seed, 1)))
        const ids = new Set(horses.map((horse) => horse.id))
        const schedule = createSchedule(horses, createRng(deriveSeed(seed, 2)))

        expect(schedule.map((round) => round.distance)).toEqual([...ROUND_DISTANCES])
        for (const round of schedule) {
          expect(new Set(round.horseIds).size).toBe(HORSES_PER_ROUND)
          for (const id of round.horseIds) expect(ids.has(id)).toBe(true)
        }
      }),
    )
  })
})
