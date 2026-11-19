import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { HORSES_PER_ROUND, PODIUM_SIZE } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import { createRoundRace } from '@/domain/race-engine'
import { createRng, deriveSeed } from '@/domain/random'
import { createSchedule } from '@/domain/schedule'
import { computeHorseStats } from '@/domain/stats'
import { seedArb } from './arbitraries'

describe('computeHorseStats (properties)', () => {
  it('[X2] totals over a full program add up', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const horses = createHorses(createRng(deriveSeed(seed, 1)))
        const schedule = createSchedule(horses, createRng(deriveSeed(seed, 2)))
        const results = schedule.map(
          (round) =>
            createRoundRace(round, horses, createRng(deriveSeed(seed, 3, round.index))).result,
        )
        const stats = [
          ...computeHorseStats(
            horses.map((h) => h.id),
            results,
          ).values(),
        ]
        const sum = (pick: (s: (typeof stats)[number]) => number) =>
          stats.reduce((total, s) => total + pick(s), 0)

        expect(sum((s) => s.roundsRun)).toBe(schedule.length * HORSES_PER_ROUND)
        expect(sum((s) => s.wins)).toBe(schedule.length)
        expect(sum((s) => s.podiums)).toBe(schedule.length * PODIUM_SIZE)
        for (const s of stats) {
          expect(s.form).toHaveLength(s.roundsRun)
          // Every horse either has not raced (null) or averages a valid position.
          expect(s.averagePosition === null || s.averagePosition >= 1).toBe(true)
          expect(s.averagePosition ?? 1).toBeLessThanOrEqual(HORSES_PER_ROUND)
        }
      }),
      { numRuns: 50 },
    )
  })
})
