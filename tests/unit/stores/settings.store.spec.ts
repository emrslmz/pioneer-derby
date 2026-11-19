import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { analyticsLog } from '@/shared/analytics'
import { THEME_STORAGE_KEY, useSettingsStore } from '@/stores/settings.store'

describe('settings store', () => {
  afterEach(() => {
    localStorage.clear()
    analyticsLog.clear()
  })

  it('[X8] follows the system theme by default', () => {
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('system')
  })

  it('[X8] restores a saved theme and ignores garbage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('dark')

    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('system')
  })

  it('[X8] cycles system → light → dark → system, persisting and tracking each change', () => {
    setActivePinia(createPinia())
    const settings = useSettingsStore()

    settings.cycleTheme()
    expect(settings.theme).toBe('light')
    settings.cycleTheme()
    expect(settings.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    settings.cycleTheme()
    expect(settings.theme).toBe('system')

    settings.setTheme('system')
    expect(analyticsLog.events.map((e) => e.name)).toEqual([
      'theme_changed',
      'theme_changed',
      'theme_changed',
    ])
  })
})
