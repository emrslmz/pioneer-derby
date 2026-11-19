import { afterEach, describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import tr from '@/i18n/locales/tr.json'
import {
  applyLocale,
  createAppI18n,
  DEFAULT_LOCALE,
  detectLocale,
  LOCALE_STORAGE_KEY,
} from '@/i18n'

function keysOf(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? keysOf(child, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('i18n', () => {
  afterEach(() => localStorage.clear())

  it('[X9] tr.json has exactly the same keys as en.json', () => {
    expect(keysOf(tr).sort()).toEqual(keysOf(en).sort())
  })

  it('[X9] prefers the saved locale over the browser language', () => {
    expect(detectLocale('tr', ['en-US'])).toBe('tr')
  })

  it('[X9] falls back to the first supported browser language', () => {
    expect(detectLocale(null, ['de-DE', 'tr-TR', 'en-US'])).toBe('tr')
  })

  it('[X9] ignores unsupported saved values and defaults to English', () => {
    expect(detectLocale('fr', ['de-DE'])).toBe(DEFAULT_LOCALE)
  })

  it('[X9] applyLocale switches language, updates <html lang> and persists the choice', () => {
    const i18n = createAppI18n('en')
    applyLocale(i18n, 'tr')

    expect(i18n.global.locale.value).toBe('tr')
    expect(i18n.global.t('app.tagline')).toBe(tr.app.tagline)
    expect(document.documentElement.lang).toBe('tr')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('tr')
  })
})
