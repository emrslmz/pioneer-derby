import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRng, sample, shuffle } from '@/domain/random'
import { seedArb } from './arbitraries'

describe('random (properties)', () => {
  it('[X2] every draw is in [0, 1)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const rng = createRng(seed)
        for (let i = 0; i < 50; i++) {
          const value = rng()
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(1)
        }
      }),
    )
  })

  it('[X2] shuffle is a permutation of its input', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer()), (seed, items) => {
        const result = shuffle(createRng(seed), items)
        expect([...result].sort((a, b) => a - b)).toEqual([...items].sort((a, b) => a - b))
      }),
    )
  })

  it('[X2] sample returns `count` distinct items from the input', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc
          .uniqueArray(fc.integer(), { minLength: 1 })
          .chain((items) => fc.tuple(fc.constant(items), fc.nat({ max: items.length }))),
        (seed, [items, count]) => {
          const picked = sample(createRng(seed), items, count)
          expect(picked).toHaveLength(count)
          expect(new Set(picked).size).toBe(count)
          for (const item of picked) expect(items).toContain(item)
        },
      ),
    )
  })
})
