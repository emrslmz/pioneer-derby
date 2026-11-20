import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { analyticsLog } from '@/shared/analytics'
import {
  DEFAULT_THEME,
  HORSES_PANEL_STORAGE_KEY,
  THEME_STORAGE_KEY,
  useSettingsStore,
} from '@/stores/settings.store'

describe('settings store', () => {
  afterEach(() => {
    localStorage.clear()
    analyticsLog.clear()
  })

  it('[X8] the first visit opens in the light theme', () => {
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe(DEFAULT_THEME)
    expect(DEFAULT_THEME).toBe('light')
  })

  it('[X8] restores a saved theme and ignores garbage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('dark')

    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    setActivePinia(createPinia())
    expect(useSettingsStore().theme).toBe('light')
  })

  it('[X8] cycles light → dark → system → light, persisting and tracking each change', () => {
    setActivePinia(createPinia())
    const settings = useSettingsStore()

    settings.cycleTheme()
    expect(settings.theme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    settings.cycleTheme()
    expect(settings.theme).toBe('system')
    settings.cycleTheme()
    expect(settings.theme).toBe('light')

    settings.setTheme('light')
    expect(analyticsLog.events.map((e) => e.name)).toEqual([
      'theme_changed',
      'theme_changed',
      'theme_changed',
    ])
  })

  it('[T2] the horse list is open on a first visit; folding it is remembered', () => {
    setActivePinia(createPinia())
    const settings = useSettingsStore()
    expect(settings.horsesPanelOpen).toBe(true)

    settings.setHorsesPanelOpen(false)
    expect(localStorage.getItem(HORSES_PANEL_STORAGE_KEY)).toBe('closed')
    setActivePinia(createPinia())
    expect(useSettingsStore().horsesPanelOpen).toBe(false)
  })
})
