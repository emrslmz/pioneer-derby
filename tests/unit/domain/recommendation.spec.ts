import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { HORSE_COLORS } from '@/domain/constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import { rateHorse, recommendHorse } from '@/domain/recommendation'
import type { Horse, Round, RoundResult } from '@/domain/types'
import { seedArb } from './arbitraries'

const horse = (id: number, condition: number): Horse => ({
  id,
  name: `H${id}`,
  color: HORSE_COLORS[id % HORSE_COLORS.length]!,
  condition,
})
const horses = [horse(1, 60), horse(2, 90), horse(3, 75), horse(4, 40)]
const round = (index: number, horseIds: number[]): Round => ({ index, distance: 1200, horseIds })
const result = (roundIndex: number, order: number[]): RoundResult => ({
  roundIndex,
  distance: 1200,
  placings: order.map((horseId, i) => ({ position: i + 1, horseId, timeMs: 1 + i })),
})

describe('recommendHorse', () => {
  it('[X4] before any results, recommends the best condition in the line-up', () => {
    expect(recommendHorse(round(0, [1, 2, 3, 4]), horses, [])).toEqual({
      horseId: 2,
      rating: 90,
      reasons: ['TOP_CONDITION'],
    })
  })

  it('[X4] blends in form from earlier rounds and explains why', () => {
    // Horse 3 won both earlier rounds; horse 2 (best condition) finished last twice.
    const earlier = [result(0, [3, 1, 4, 2]), result(1, [3, 4, 1, 2])]
    const tip = recommendHorse(round(2, [1, 2, 3, 4]), horses, earlier)
    expect(tip.horseId).toBe(3)
    expect(tip.reasons).toEqual(['IN_FORM', 'PREVIOUS_WINNER'])
  })

  it('[X4] ignores results of the round itself or later rounds (no peeking)', () => {
    const future = [result(2, [4, 1, 3, 2])]
    expect(recommendHorse(round(2, [1, 2, 3, 4]), horses, future).horseId).toBe(2)
  })

  it('[X4] falls back to BEST_RATING when no specific reason applies', () => {
    // A (70) finished 4th twice; B (72, top condition) finished 10th twice. Fillers fill the field.
    const a = horse(1, 70)
    const b = horse(2, 72)
    const field = (aPos: number, bPos: number) => {
      const order = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]
      order[aPos - 1] = 1
      order[bPos - 1] = 2
      return order
    }
    const earlier = [result(0, field(4, 10)), result(1, field(4, 10))]
    const tip = recommendHorse(round(2, [1, 2]), [a, b], earlier)
    expect(tip).toMatchObject({ horseId: 1, reasons: ['BEST_RATING'] })
  })

  it('[X4] breaks ties in favour of the lower lane', () => {
    const twins = [horse(10, 80), horse(11, 80)]
    expect(recommendHorse(round(0, [11, 10]), twins, []).horseId).toBe(11)
  })

  it('[X4] rejects unknown horses', () => {
    expect(() => recommendHorse(round(0, [99]), horses, [])).toThrow(/unknown horse 99/)
  })

  it('[X4] rates condition 1 → 0 and condition 100 → 100 without form', () => {
    expect(rateHorse(horse(1, 1), undefined)).toBe(0)
    expect(rateHorse(horse(1, 100), undefined)).toBe(100)
  })

  it('[X2] for any seed the tip is one of the round runners, rated 0–100, with a reason', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 5 }), (seed, roundIndex) => {
        const all = horsesForSeed(seed)
        const schedule = scheduleForSeed(all, seed)
        const results = schedule
          .slice(0, roundIndex)
          .map((r) => roundRaceForSeed(r, all, seed).result)
        const tip = recommendHorse(schedule[roundIndex]!, all, results)
        expect(schedule[roundIndex]!.horseIds).toContain(tip.horseId)
        expect(tip.rating).toBeGreaterThanOrEqual(0)
        expect(tip.rating).toBeLessThanOrEqual(100)
        expect(tip.reasons.length).toBeGreaterThan(0)
      }),
      { numRuns: 60 },
    )
  })
})
