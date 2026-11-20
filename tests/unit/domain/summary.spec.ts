import { describe, expect, it } from 'vitest'
import { ROUND_COUNT } from '@/domain/constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import { chartMaximum, SUMMARY_CHART_SIZE, summarizeProgram } from '@/domain/summary'
import type { RoundResult } from '@/domain/types'

function resultsForSeed(seed: number): { horseIds: number[]; results: RoundResult[] } {
  const horses = horsesForSeed(seed)
  const results = scheduleForSeed(horses, seed).map(
    (round) => roundRaceForSeed(round, horses, seed).result,
  )
  return { horseIds: horses.map((horse) => horse.id), results }
}

describe('program summary', () => {
  it('[X13] names the horse with the most wins as champion, and lists the six winners', () => {
    const { horseIds, results } = resultsForSeed(42)
    const summary = summarizeProgram(horseIds, results)

    expect(summary.roundWinners).toHaveLength(ROUND_COUNT)
    expect(summary.roundWinners.map((winner) => winner.roundIndex)).toEqual([0, 1, 2, 3, 4, 5])
    for (const [index, winner] of summary.roundWinners.entries()) {
      expect(winner.horseId).toBe(results[index]!.placings[0]!.horseId)
      expect(winner.timeMs).toBe(results[index]!.placings[0]!.timeMs)
    }

    const winsOf = (id: number) => summary.roundWinners.filter((w) => w.horseId === id).length
    expect(summary.champion!.wins).toBe(Math.max(...horseIds.map(winsOf)))
    expect(summary.standings[0]).toBe(summary.champion)
  })

  it('[X13] ties are broken by podiums, then average position, then the lowest number', () => {
    const placings = (order: number[]) =>
      order.map((horseId, index) => ({ position: index + 1, horseId, timeMs: 1000 + index }))
    // Horses 1 and 2 each win one round; horse 2 has more podiums.
    const results: RoundResult[] = [
      { roundIndex: 0, distance: 1200, placings: placings([1, 2, 3]) },
      { roundIndex: 1, distance: 1400, placings: placings([2, 4, 5]) },
      { roundIndex: 2, distance: 1600, placings: placings([3, 2, 1]) },
    ]
    const summary = summarizeProgram([1, 2, 3, 4, 5], results)
    expect(summary.champion!.horseId).toBe(2)
    expect(summary.standings.map((horse) => horse.horseId).slice(0, 3)).toEqual([2, 1, 3])
  })

  it('[X13] equal horses are ordered by number, a better average position breaks a podium tie', () => {
    const placings = (order: number[]) =>
      order.map((horseId, index) => ({ position: index + 1, horseId, timeMs: 1000 + index }))
    // Horses 1 and 2 are identical: one win, one second place.
    const identical: RoundResult[] = [
      { roundIndex: 0, distance: 1200, placings: placings([1, 2]) },
      { roundIndex: 1, distance: 1400, placings: placings([2, 1]) },
    ]
    expect(summarizeProgram([1, 2], identical).standings.map((horse) => horse.horseId)).toEqual([
      1, 2,
    ])

    // Horses 3 and 4 both have no win and two podiums, but 4 finished better on average.
    const averages: RoundResult[] = [
      { roundIndex: 0, distance: 1200, placings: placings([5, 3, 4]) },
      { roundIndex: 1, distance: 1400, placings: placings([5, 4, 3]) },
    ]
    const ranked = summarizeProgram([3, 4, 5], averages).standings.map((horse) => horse.horseId)
    expect(ranked[0]).toBe(5) // two wins
    expect(ranked.slice(1)).toEqual([3, 4]) // 3 and 4 are level on everything: lowest number first
  })

  it('[X13] a round without a winner (no placings) is left out of the winners list', () => {
    const results: RoundResult[] = [
      { roundIndex: 0, distance: 1200, placings: [] },
      { roundIndex: 1, distance: 1400, placings: [{ position: 1, horseId: 7, timeMs: 5000 }] },
    ]
    const summary = summarizeProgram([7], results)
    expect(summary.roundWinners.map((winner) => winner.roundIndex)).toEqual([1])
  })

  it('[X13] before any round is finished there is no champion', () => {
    const summary = summarizeProgram([1, 2, 3], [])
    expect(summary.champion).toBeNull()
    expect(summary.standings).toEqual([])
    expect(summary.roundWinners).toEqual([])
  })

  it('[X13] the chart shows at most six horses and scales bars to the longest', () => {
    const { horseIds, results } = resultsForSeed(7)
    const summary = summarizeProgram(horseIds, results)
    expect(summary.standings.length).toBeLessThanOrEqual(SUMMARY_CHART_SIZE)
    expect(chartMaximum(summary.standings)).toBe(
      Math.max(1, ...summary.standings.map((horse) => horse.podiums)),
    )
    expect(chartMaximum([])).toBe(1) // never a zero-length scale
  })

  it('[X2] for any seed: the wins add up to the rounds and the champion has the most', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { horseIds, results } = resultsForSeed(seed)
      const summary = summarizeProgram(horseIds, results)
      const totalWins = summary.standings.reduce((sum, horse) => sum + horse.wins, 0)
      expect(totalWins).toBeLessThanOrEqual(ROUND_COUNT)
      expect(summary.roundWinners).toHaveLength(ROUND_COUNT)
      const best = Math.max(...summary.standings.map((horse) => horse.wins))
      expect(summary.champion!.wins).toBe(best)
      // Deterministic: the same results, the same summary.
      expect(summarizeProgram(horseIds, results)).toEqual(summary)
    }
  })
})
