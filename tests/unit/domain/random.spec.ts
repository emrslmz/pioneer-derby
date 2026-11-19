import { describe, expect, it } from 'vitest'
import {
  createRng,
  deriveSeed,
  randomFloat,
  randomInt,
  sample,
  shuffle,
  toSeed,
} from '@/domain/random'

const draw = (seed: number, count = 5) => {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => rng())
}

describe('random', () => {
  it('[X11] the same seed always produces the same sequence', () => {
    expect(draw(42)).toEqual(draw(42))
  })

  it('[X11] different seeds produce different sequences', () => {
    expect(draw(1)).not.toEqual(draw(2))
  })

  it('[X11] normalises seeds into uint32', () => {
    expect(toSeed(-1)).toBe(0xffff_ffff)
    expect(toSeed(3.9)).toBe(3)
    expect(toSeed(Number.NaN)).toBe(0)
    expect(toSeed(Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('[X11] derives distinct, stable seeds per concern', () => {
    expect(deriveSeed(7, 1)).toBe(deriveSeed(7, 1))
    expect(deriveSeed(7, 1)).not.toBe(deriveSeed(7, 2))
    expect(deriveSeed(7, 1)).not.toBe(deriveSeed(8, 1))
    expect(deriveSeed(7, 1, 2)).not.toBe(deriveSeed(7, 2, 1))
  })

  it('[X11] randomFloat stays inside [min, max)', () => {
    expect(randomFloat(() => 0, 2, 4)).toBe(2)
    expect(randomFloat(() => 0.5, 2, 4)).toBe(3)
  })

  it('[C3] randomInt covers both ends of the range', () => {
    expect(randomInt(() => 0, 1, 100)).toBe(1)
    expect(randomInt(() => 0.999_999, 1, 100)).toBe(100)
  })

  it('[C3] randomInt rejects invalid ranges', () => {
    expect(() => randomInt(createRng(1), 5, 1)).toThrow(RangeError)
    expect(() => randomInt(createRng(1), 1.5, 3)).toThrow(RangeError)
  })

  it('[C5] shuffle keeps every item and does not mutate the input', () => {
    const items = [1, 2, 3, 4, 5]
    const result = shuffle(createRng(1), items)
    expect(items).toEqual([1, 2, 3, 4, 5])
    expect([...result].sort()).toEqual(items)
  })

  it('[C5] sample rejects impossible counts', () => {
    expect(() => sample(createRng(1), [1, 2], 3)).toThrow(RangeError)
    expect(() => sample(createRng(1), [1, 2], -1)).toThrow(RangeError)
    expect(sample(createRng(1), [1, 2], 0)).toEqual([])
  })
})
