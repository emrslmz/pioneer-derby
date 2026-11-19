import { describe, expect, it } from 'vitest'
import { scorePrediction } from '@/domain/prediction'
import type { RoundResult } from '@/domain/types'

const result: RoundResult = {
  roundIndex: 0,
  distance: 1200,
  placings: [7, 3, 9, 1].map((horseId, i) => ({ position: i + 1, horseId, timeMs: 6000 + i })),
}

describe('scorePrediction', () => {
  it('[X4] the winner earns 3 points', () => {
    expect(scorePrediction(7, result)).toEqual({ outcome: 'winner', points: 3, position: 1 })
  })

  it('[X4] a podium finish earns 1 point', () => {
    expect(scorePrediction(3, result)).toEqual({ outcome: 'podium', points: 1, position: 2 })
    expect(scorePrediction(9, result).points).toBe(1)
  })

  it('[X4] anything else earns nothing', () => {
    expect(scorePrediction(1, result)).toEqual({ outcome: 'miss', points: 0, position: 4 })
    expect(scorePrediction(99, result)).toEqual({ outcome: 'miss', points: 0, position: null })
  })
})
