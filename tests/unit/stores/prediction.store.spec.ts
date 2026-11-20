import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { analyticsLog } from '@/shared/analytics'
import { usePredictionStore } from '@/stores/prediction.store'
import { msToRoundEnd, setupRace } from './race-helpers'

afterEach(() => vi.useRealTimers())

function setup() {
  const race = setupRace(42)
  const prediction = usePredictionStore()
  race.generateProgram()
  return { race, prediction }
}

describe('prediction store', () => {
  it('[X4] picks are open before a round and locked while it runs', () => {
    const { race, prediction } = setup()
    expect(prediction.isOpen).toBe(true)

    race.start()
    expect(prediction.isOpen).toBe(false)
    expect(prediction.pick(race.currentRound!.horseIds[0]!)).toBe(false)
  })

  it('[X4] is closed before a program exists', () => {
    setupRace(42)
    expect(usePredictionStore().isOpen).toBe(false)
  })

  it('[X4] accepts one pick per round, only for a horse in that round', () => {
    const { race, prediction } = setup()
    const [first, second] = race.currentRound!.horseIds
    const outsider = [...Array(20).keys()]
      .map((i) => i + 1)
      .find((id) => !race.currentRound!.horseIds.includes(id))!

    expect(prediction.pick(outsider)).toBe(false)
    expect(prediction.pick(first!)).toBe(true)
    expect(prediction.pick(second!)).toBe(true)
    expect(prediction.currentPick).toBe(second)
  })

  it('[X4] recommends a runner of the current round', () => {
    const { race, prediction } = setup()
    expect(race.currentRound!.horseIds).toContain(prediction.recommendation!.horseId)
  })

  it('[X4] scores the pick when the round finishes and tracks both events', async () => {
    const { race, prediction } = setup()
    const tip = prediction.recommendation!.horseId
    prediction.pick(tip)
    race.start()
    vi.advanceTimersByTime(msToRoundEnd(race))
    await nextTick()

    const [scored] = prediction.predictions
    expect(scored!.followedRecommendation).toBe(true)
    expect(scored!.score).not.toBeNull()
    expect(prediction.totalPoints).toBe(scored!.score!.points)
    expect(prediction.correctWinners).toBe(scored!.score!.outcome === 'winner' ? 1 : 0)

    const names = analyticsLog.events.map((e) => e.name)
    expect(names).toContain('prediction_made')
    expect(names.at(-1)).toBe('prediction_result')
  })

  it('[X4] reopens between rounds for the next round', async () => {
    const { race, prediction } = setup()
    race.start()
    vi.advanceTimersByTime(msToRoundEnd(race))
    await nextTick()
    expect(race.status).toBe('intermission')
    expect(prediction.isOpen).toBe(true)
    expect(prediction.pick(race.currentRound!.horseIds[3]!)).toBe(true)
    expect(Object.keys(prediction.picks)).toEqual(['1'])
  })

  it('[X4] adds up points over the whole program', async () => {
    const { race, prediction } = setup()
    // Always back the eventual winner of round 1, and the tip afterwards.
    prediction.pick(race.currentRace!.result.placings[0]!.horseId)
    race.start()
    for (let round = 0; round < 6; round++) {
      vi.advanceTimersByTime(msToRoundEnd(race))
      await nextTick()
      if (prediction.isOpen) prediction.pick(prediction.recommendation!.horseId)
      if (race.status === 'intermission') race.nextRound()
      await nextTick()
    }
    expect(race.status).toBe('finished')
    const expected = prediction.predictions.reduce((sum, p) => sum + (p.score?.points ?? 0), 0)
    expect(prediction.totalPoints).toBe(expected)
    expect(prediction.totalPoints).toBeGreaterThanOrEqual(3)
  })

  it('[X4] a new program starts a fresh game', async () => {
    const { race, prediction } = setup()
    prediction.pick(race.currentRound!.horseIds[0]!)
    race.generateProgram()
    await nextTick()
    expect(prediction.picks).toEqual({})
    expect(prediction.totalPoints).toBe(0)
  })
})
