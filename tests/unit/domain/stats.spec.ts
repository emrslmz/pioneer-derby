import { describe, expect, it } from 'vitest'
import { computeHorseStats } from '@/domain/stats'
import type { RoundResult } from '@/domain/types'

const result = (roundIndex: number, order: number[]): RoundResult => ({
  roundIndex,
  distance: 1200 + roundIndex * 200,
  placings: order.map((horseId, i) => ({ position: i + 1, horseId, timeMs: 1000 + i })),
})

describe('computeHorseStats', () => {
  it('[X12] horses that have not raced get empty stats', () => {
    const stats = computeHorseStats([1, 2], [])
    expect(stats.get(1)).toEqual({
      horseId: 1,
      roundsRun: 0,
      wins: 0,
      podiums: 0,
      averagePosition: null,
      form: [],
    })
  })

  it('[X12] counts rounds, wins, podiums, average position and form in round order', () => {
    // Passed out of order on purpose: form must follow round order.
    const stats = computeHorseStats(
      [1, 2, 3, 4],
      [result(1, [2, 1, 4, 3]), result(0, [1, 3, 2, 4]), result(2, [4, 3, 2, 1])],
    )

    expect(stats.get(1)).toMatchObject({ roundsRun: 3, wins: 1, podiums: 2, form: [1, 2, 4] })
    expect(stats.get(1)?.averagePosition).toBeCloseTo(7 / 3)
    expect(stats.get(2)).toMatchObject({ wins: 1, podiums: 3, form: [3, 1, 3] })
    expect(stats.get(4)).toMatchObject({ wins: 1, podiums: 2, form: [4, 3, 1] })
  })

  it('[X12] ignores horses that are not tracked', () => {
    const stats = computeHorseStats([1], [result(0, [1, 99])])
    expect([...stats.keys()]).toEqual([1])
    expect(stats.get(1)?.form).toEqual([1])
  })
})
