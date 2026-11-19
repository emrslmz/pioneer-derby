import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { HORSES_PER_ROUND } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import { createRoundRace, progressAt } from '@/domain/race-engine'
import { createRng, deriveSeed } from '@/domain/random'
import { createSchedule } from '@/domain/schedule'
import { seedArb } from './arbitraries'

const raceFor = (seed: number, roundIndex: number) => {
  const horses = createHorses(createRng(deriveSeed(seed, 1)))
  const schedule = createSchedule(horses, createRng(deriveSeed(seed, 2)))
  const round = schedule[roundIndex]
  if (!round) throw new Error(`no round ${roundIndex}`)
  return createRoundRace(round, horses, createRng(deriveSeed(seed, 3, roundIndex)))
}

const roundIndexArb = fc.integer({ min: 0, max: 5 })

describe('race engine (properties)', () => {
  it('[X2] every runner gets exactly one placing, positions 1..10', () => {
    fc.assert(
      fc.property(seedArb, roundIndexArb, (seed, roundIndex) => {
        const { round, result } = raceFor(seed, roundIndex)
        expect(result.placings.map((p) => p.position)).toEqual(
          Array.from({ length: HORSES_PER_ROUND }, (_, i) => i + 1),
        )
        expect(new Set(result.placings.map((p) => p.horseId))).toEqual(new Set(round.horseIds))
      }),
    )
  })

  it('[X2] horses only move forward and finish exactly at their finish time', () => {
    fc.assert(
      fc.property(seedArb, roundIndexArb, (seed, roundIndex) => {
        const { profiles, durationMs } = raceFor(seed, roundIndex)
        for (const profile of profiles) {
          let previous = 0
          for (let step = 0; step <= 40; step++) {
            const progress = progressAt(profile, (durationMs * step) / 40)
            expect(progress).toBeGreaterThanOrEqual(previous)
            previous = progress
          }
          expect(progressAt(profile, profile.finishTimeMs)).toBe(1)
          expect(progressAt(profile, profile.finishTimeMs * 0.999)).toBeLessThan(1)
        }
      }),
    )
  })

  it('[X2] the winner is the first horse to reach the finish line', () => {
    fc.assert(
      fc.property(seedArb, roundIndexArb, (seed, roundIndex) => {
        const { profiles, result } = raceFor(seed, roundIndex)
        const [winner] = result.placings
        const finishedAtWinnerTime = profiles.filter(
          (profile) => progressAt(profile, winner!.timeMs) === 1,
        )
        expect(finishedAtWinnerTime.map((p) => p.horseId)).toContain(winner!.horseId)
      }),
    )
  })

  it('[X2] races are fully determined by the seed', () => {
    fc.assert(
      fc.property(seedArb, roundIndexArb, (seed, roundIndex) => {
        expect(raceFor(seed, roundIndex)).toEqual(raceFor(seed, roundIndex))
      }),
      { numRuns: 30 },
    )
  })
})
