import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { analytics } from '@/shared/analytics'
import { formatDistance, formatOrdinal, formatRaceTime } from './format'
import { persistLocale, SUPPORTED_LOCALES, type AppLocale } from './index'

/** Current language plus locale-aware formatters for components (X9). */
export function useLocale() {
  const { locale, t } = useI18n({ useScope: 'global' })

  const current = computed(() => locale.value as AppLocale)

  function setLocale(next: AppLocale): void {
    const previous = current.value
    if (next === previous) return
    locale.value = next
    persistLocale(next)
    analytics.track('language_changed', { from: previous, to: next })
  }

  function toggleLocale(): void {
    const index = SUPPORTED_LOCALES.indexOf(current.value)
    setLocale(SUPPORTED_LOCALES[(index + 1) % SUPPORTED_LOCALES.length] as AppLocale)
  }

  const ordinal = (value: number) => formatOrdinal(value, current.value)
  const distance = (metres: number) => formatDistance(metres, current.value)
  const raceTime = (ms: number) => formatRaceTime(ms, current.value)

  /** "1st Lap – 1200 m" / "1. Tur – 1200 m" for a 0-based round index. */
  const lapLabel = (roundIndex: number, metres: number) =>
    t('round.lap', { ordinal: ordinal(roundIndex + 1), distance: distance(metres) })

  return {
    locale: current,
    locales: SUPPORTED_LOCALES,
    setLocale,
    toggleLocale,
    ordinal,
    distance,
    raceTime,
    lapLabel,
  }
}
