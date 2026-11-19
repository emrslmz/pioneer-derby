import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createAppI18n, LOCALE_STORAGE_KEY } from '@/i18n'
import { useLocale } from '@/i18n/useLocale'
import { analyticsLog } from '@/shared/analytics'

function setup(locale: 'en' | 'tr' = 'en') {
  let api!: ReturnType<typeof useLocale>
  mount(
    defineComponent({
      setup() {
        api = useLocale()
        return () => null
      },
    }),
    { global: { plugins: [createAppI18n(locale)] } },
  )
  return api
}

describe('useLocale', () => {
  afterEach(() => {
    localStorage.clear()
    analyticsLog.clear()
  })

  it('[X9] builds lap labels per locale', () => {
    const api = setup('en')
    expect(api.lapLabel(1, 1400)).toBe('2nd Lap – 1400 m')
    api.setLocale('tr')
    expect(api.lapLabel(1, 1400)).toBe('2. Tur – 1400 m')
  })

  it('[X9] switching language persists it, updates <html lang> and tracks an event', () => {
    const api = setup('en')
    api.toggleLocale()

    expect(api.locale.value).toBe('tr')
    expect(document.documentElement.lang).toBe('tr')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('tr')
    expect(analyticsLog.events.at(-1)).toMatchObject({
      name: 'language_changed',
      payload: { from: 'en', to: 'tr' },
    })
  })

  it('[X9] selecting the current language is a no-op', () => {
    const api = setup('en')
    api.setLocale('en')
    expect(analyticsLog.events).toHaveLength(0)
  })
})
