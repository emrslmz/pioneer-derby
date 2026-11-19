import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStorage, writeStorage } from '@/shared/utils/storage'

describe('storage', () => {
  afterEach(() => localStorage.clear())

  it('[X9] reads back what it writes', () => {
    writeStorage('key', 'value')
    expect(readStorage('key')).toBe('value')
  })

  it('[X9] never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => writeStorage('key', 'value')).not.toThrow()
    expect(readStorage('key')).toBeNull()
  })
})
