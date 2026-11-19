import { describe, expect, it } from 'vitest'
import { formatDistance, formatOrdinal } from '@/i18n/format'

describe('locale formatting', () => {
  it('[X9] English ordinals are 1st, 2nd, 3rd, 4th … (fixes the example\'s "2ST Lap")', () => {
    expect([1, 2, 3, 4, 5, 6, 11, 12, 13, 21, 22].map((n) => formatOrdinal(n, 'en'))).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '6th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ])
  })

  it('[X9] Turkish ordinals are 1., 2., 3. …', () => {
    expect([1, 2, 6].map((n) => formatOrdinal(n, 'tr'))).toEqual(['1.', '2.', '6.'])
  })

  it('[C6] distances read "1200 m" in both languages, without a thousands separator', () => {
    expect(formatDistance(1200, 'en')).toBe('1200 m')
    expect(formatDistance(2200, 'tr')).toBe('2200 m')
  })
})

describe('race time', () => {
  it('[R5] shows race time in seconds with two decimals per locale', async () => {
    const { formatRaceTime } = await import('@/i18n/format')
    expect(formatRaceTime(6523, 'en')).toBe('6.52s')
    expect(formatRaceTime(6523, 'tr')).toBe('6,52sn')
  })
})
