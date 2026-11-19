import { afterEach, describe, expect, it } from 'vitest'
import { createRandomSeed, parseSeed, readSeedFromUrl, writeSeedToUrl } from '@/shared/utils/seed'

describe('seed utils', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('[X11] parses valid uint32 seeds only', () => {
    expect(parseSeed('0')).toBe(0)
    expect(parseSeed('4294967295')).toBe(4294967295)
    expect(parseSeed('4294967296')).toBeNull()
    expect(parseSeed('-1')).toBeNull()
    expect(parseSeed('12abc')).toBeNull()
    expect(parseSeed('')).toBeNull()
    expect(parseSeed(null)).toBeNull()
  })

  it('[X11] reads ?seed= from the query string', () => {
    expect(readSeedFromUrl('?seed=1234&debug=1')).toBe(1234)
    expect(readSeedFromUrl('?debug=1')).toBeNull()
  })

  it('[X11] writes the seed into the URL without touching other params', () => {
    window.history.replaceState(null, '', '/?debug=1')
    writeSeedToUrl(77)
    expect(window.location.search).toBe('?debug=1&seed=77')
    expect(readSeedFromUrl()).toBe(77)
  })

  it('[X11] creates random uint32 seeds', () => {
    const seed = createRandomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffff_ffff)
  })
})
