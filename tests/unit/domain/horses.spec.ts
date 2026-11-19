import { describe, expect, it } from 'vitest'
import { HORSE_COLORS, HORSE_NAMES } from '@/domain/constants'
import { createHorses } from '@/domain/horses'
import { createRng } from '@/domain/random'

describe('createHorses', () => {
  const horses = createHorses(createRng(2024))

  it('[C1] creates 20 horses numbered 1 to 20', () => {
    expect(horses.map((horse) => horse.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })

  it('[C2] gives every horse a different colour from the palette', () => {
    const keys = horses.map((horse) => horse.color.key)
    expect(new Set(keys).size).toBe(20)
    expect([...keys].sort()).toEqual(HORSE_COLORS.map((color) => color.key).sort())
  })

  it('[R2] uses every pioneer name exactly once', () => {
    expect(horses.map((horse) => horse.name).sort()).toEqual([...HORSE_NAMES].sort())
  })

  it('[C3] gives every horse an integer condition between 1 and 100', () => {
    for (const { condition } of horses) {
      expect(Number.isInteger(condition)).toBe(true)
      expect(condition).toBeGreaterThanOrEqual(1)
      expect(condition).toBeLessThanOrEqual(100)
    }
  })

  it('[R2] is random: different seeds give different horses', () => {
    expect(createHorses(createRng(1))).not.toEqual(createHorses(createRng(2)))
  })

  it('[X11] is reproducible from the same seed', () => {
    expect(createHorses(createRng(2024))).toEqual(horses)
  })
})
