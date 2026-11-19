import { describe, expect, it } from 'vitest'
import { createHorses } from '@/domain/horses'
import { createRng } from '@/domain/random'
import { createSchedule } from '@/domain/schedule'

describe('createSchedule', () => {
  const horses = createHorses(createRng(7))
  const schedule = createSchedule(horses, createRng(8))

  it('[R3] [C4] creates 6 rounds indexed 0 to 5', () => {
    expect(schedule.map((round) => round.index)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('[C6] assigns 1200 to 2200 m in order', () => {
    expect(schedule.map((round) => round.distance)).toEqual([1200, 1400, 1600, 1800, 2000, 2200])
  })

  it('[C5] picks 10 distinct horses per round', () => {
    for (const round of schedule) {
      expect(round.horseIds).toHaveLength(10)
      expect(new Set(round.horseIds).size).toBe(10)
    }
  })

  it('[C5] only picks horses that exist', () => {
    const ids = new Set(horses.map((horse) => horse.id))
    for (const round of schedule) for (const id of round.horseIds) expect(ids.has(id)).toBe(true)
  })

  it('[C5] samples each round independently (rounds differ)', () => {
    const lineups = new Set(schedule.map((round) => [...round.horseIds].sort().join(',')))
    expect(lineups.size).toBeGreaterThan(1)
  })

  it('[X11] is reproducible from the same seed', () => {
    expect(createSchedule(horses, createRng(8))).toEqual(schedule)
  })

  it('[C5] refuses to build a program with fewer than 10 horses', () => {
    expect(() => createSchedule(horses.slice(0, 9), createRng(1))).toThrow(RangeError)
  })
})
