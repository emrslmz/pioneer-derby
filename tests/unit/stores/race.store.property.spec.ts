import fc from 'fast-check'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RACE_SPEEDS } from '@/domain/constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import { setupRace } from './race-helpers'

afterEach(() => vi.useRealTimers())

const actionArb = fc.oneof(
  fc.constant({ kind: 'toggle' as const }),
  fc.record({ kind: fc.constant('wait' as const), ms: fc.integer({ min: 0, max: 12_000 }) }),
  fc.record({ kind: fc.constant('speed' as const), to: fc.constantFrom(...RACE_SPEEDS) }),
)

describe('race store (properties)', () => {
  it('[X2] pausing, resuming and speed changes never change the outcome', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 0xffff_ffff }),
        fc.array(actionArb, { maxLength: 40 }),
        (seed, actions) => {
          const race = setupRace(seed)
          race.generateProgram()
          race.start()

          for (const action of actions) {
            if (action.kind === 'toggle') race.toggle()
            if (action.kind === 'wait') vi.advanceTimersByTime(action.ms)
            if (action.kind === 'speed') race.setSpeed(action.to)

            // R5: results are always a prefix of the program, in round order.
            expect(race.completedResults.map((r) => r.roundIndex)).toEqual(
              race.completedResults.map((_, i) => i),
            )
          }

          // Let the program finish, whatever state the actions left it in.
          if (race.status === 'paused') race.resume()
          vi.runAllTimers()

          const horses = horsesForSeed(seed)
          const expected = scheduleForSeed(horses, seed).map(
            (round) => roundRaceForSeed(round, horses, seed).result,
          )
          expect(race.status).toBe('finished')
          expect(race.completedResults).toEqual(expected)
          vi.useRealTimers()
        },
      ),
      { numRuns: 40 },
    )
  })
})
