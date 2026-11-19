import { describe, expect, it } from 'vitest'
import {
  CONDITION_MAX,
  CONDITION_MIN,
  HORSE_COLORS,
  HORSE_COUNT,
  HORSE_NAMES,
  HORSES_PER_ROUND,
  ROUND_COUNT,
  ROUND_DISTANCES,
  SPEED_MODEL,
} from '@/domain/constants'

describe('constants', () => {
  it('[C1] the game has 20 horses', () => {
    expect(HORSE_COUNT).toBe(20)
  })

  it('[C2] there is one distinct colour (name and hex) per horse', () => {
    expect(HORSE_COLORS).toHaveLength(HORSE_COUNT)
    expect(new Set(HORSE_COLORS.map((color) => color.key)).size).toBe(HORSE_COUNT)
    expect(new Set(HORSE_COLORS.map((color) => color.hex.toLowerCase())).size).toBe(HORSE_COUNT)
    for (const color of HORSE_COLORS) expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('[R2] there is one distinct pioneer name per horse', () => {
    expect(new Set(HORSE_NAMES).size).toBe(HORSE_COUNT)
  })

  it('[C3] condition ranges from 1 to 100', () => {
    expect([CONDITION_MIN, CONDITION_MAX]).toEqual([1, 100])
  })

  it('[C4] a program has 6 rounds', () => {
    expect(ROUND_COUNT).toBe(6)
  })

  it('[C5] 10 horses run in each round', () => {
    expect(HORSES_PER_ROUND).toBe(10)
  })

  it('[C6] round distances are 1200, 1400, 1600, 1800, 2000 and 2200 m', () => {
    expect(ROUND_DISTANCES).toEqual([1200, 1400, 1600, 1800, 2000, 2200])
  })

  it('[R6] surges can never make a horse stop or run backwards', () => {
    expect(SPEED_MODEL.surgeCount * SPEED_MODEL.maxSurgeAmplitude).toBeLessThan(1)
  })
})
