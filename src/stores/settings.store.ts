import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analytics, type ThemePreference } from '@/shared/analytics'
import { readStorage, writeStorage } from '@/shared/utils/storage'

export const THEME_STORAGE_KEY = 'pioneer-derby:theme'
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

/**
 * User preferences that survive a reload. The language lives in vue-i18n (see `useLocale`);
 * the race speed lives in the race store because it changes the clock.
 */
export const useSettingsStore = defineStore('settings', () => {
  const stored = readStorage(THEME_STORAGE_KEY)
  const theme = ref<ThemePreference>(isThemePreference(stored) ? stored : 'system')

  function setTheme(next: ThemePreference): void {
    if (next === theme.value) return
    analytics.track('theme_changed', { from: theme.value, to: next })
    theme.value = next
    writeStorage(THEME_STORAGE_KEY, next)
  }

  /** system → light → dark → system */
  function cycleTheme(): void {
    const index = THEME_PREFERENCES.indexOf(theme.value)
    setTheme(THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length] as ThemePreference)
  }

  return { theme, setTheme, cycleTheme }
})
