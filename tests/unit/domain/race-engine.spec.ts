import { describe, expect, it } from 'vitest'
import { HORSE_COLORS, RACE_TIMING } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import {
  baseSpeedFactor,
  createRoundRace,
  createSpeedProfile,
  finishingOrder,
  positionAt,
  progressAt,
  roundDurationMs,
} from '@/domain/race-engine'
import { createRng } from '@/domain/random'
import { createSchedule } from '@/domain/schedule'
import type { Horse, SpeedProfile } from '@/domain/types'

const horse = (id: number, condition: number): Horse => ({
  id,
  name: `Horse ${id}`,
  color: HORSE_COLORS[0],
  condition,
})

const profile = (overrides: Partial<SpeedProfile> = {}): SpeedProfile => ({
  horseId: 1,
  lane: 0,
  finishTimeMs: 1000,
  surges: [],
  ...overrides,
})

describe('race engine', () => {
  const horses = createHorses(createRng(11))
  const [firstRound] = createSchedule(horses, createRng(12))
  if (!firstRound) throw new Error('schedule is empty')
  const race = createRoundRace(firstRound, horses, createRng(13))

  it('[R6] rounds run at a real racing pace: duration grows with the distance', () => {
    expect(RACE_TIMING.metresPerSecond).toBe(16.5)
    expect(roundDurationMs(1650)).toBe(100_000)
    expect(roundDurationMs(1200) / 1000).toBeCloseTo(72.7, 1)
    expect(roundDurationMs(2200)).toBeCloseTo((2200 / 1200) * roundDurationMs(1200))
  })

  it('[X1] better condition means a higher base speed', () => {
    expect(baseSpeedFactor(100)).toBeGreaterThan(baseSpeedFactor(50))
    expect(baseSpeedFactor(50)).toBeGreaterThan(baseSpeedFactor(1))
  })

  it('[R6] a horse starts at 0, moves forward and stops exactly at the finish', () => {
    const p = profile({ surges: [{ amplitude: 0.2, frequency: 2, phase: 1 }] })
    expect(progressAt(p, -50)).toBe(0)
    expect(progressAt(p, 0)).toBe(0)
    expect(progressAt(p, 250)).toBeGreaterThan(0)
    expect(progressAt(p, 250)).toBeLessThan(1)
    expect(progressAt(p, 1000)).toBe(1)
    expect(progressAt(p, 5000)).toBe(1)
  })

  it('[R6] without surges a horse runs at constant speed', () => {
    expect(progressAt(profile(), 500)).toBe(0.5)
    expect(positionAt(profile(), 1200, 500)).toBe(600)
  })

  it('[R5] placings follow finish times, ties broken by lane', () => {
    const placings = finishingOrder([
      profile({ horseId: 1, lane: 0, finishTimeMs: 900 }),
      profile({ horseId: 2, lane: 1, finishTimeMs: 800 }),
      profile({ horseId: 3, lane: 2, finishTimeMs: 800 }),
    ])
    expect(placings).toEqual([
      { position: 1, horseId: 2, timeMs: 800 },
      { position: 2, horseId: 3, timeMs: 800 },
      { position: 3, horseId: 1, timeMs: 900 },
    ])
  })

  it('[R5] a round result ranks all 10 runners, fastest first', () => {
    const { placings } = race.result
    expect(placings.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(placings.map((p) => p.horseId).sort()).toEqual([...firstRound.horseIds].sort())
    for (let i = 1; i < placings.length; i++) {
      expect(placings[i]!.timeMs).toBeGreaterThanOrEqual(placings[i - 1]!.timeMs)
    }
  })

  it('[R5] the round lasts until the last horse finishes', () => {
    expect(race.durationMs).toBe(race.result.placings[race.result.placings.length - 1]?.timeMs)
    expect(race.result).toMatchObject({ roundIndex: 0, distance: 1200 })
  })

  it('[R6] profiles are in lane order', () => {
    expect(race.profiles.map((p) => p.horseId)).toEqual(firstRound.horseIds)
    expect(race.profiles.map((p) => p.lane)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('[X11] the same seed replays the same race', () => {
    expect(createRoundRace(firstRound, horses, createRng(13))).toEqual(race)
  })

  it('[X1] a top-condition horse beats a weak one when noise is equal', () => {
    const neutral = () => 0.5
    const strong = createSpeedProfile(horse(1, 100), 0, 1600, neutral)
    const weak = createSpeedProfile(horse(2, 1), 1, 1600, neutral)
    expect(strong.finishTimeMs).toBeLessThan(weak.finishTimeMs)
  })

  it('[R5] rejects rounds that reference unknown horses', () => {
    expect(() => createRoundRace({ ...firstRound, horseIds: [999] }, horses, createRng(1))).toThrow(
      /unknown horse 999/,
    )
  })
})
