import type { AppLocale } from './index'

/**
 * Locale-aware number formatting (docs/ARCHITECTURE.md §8).
 * Fixes the example screenshot's "2ST Lap" / "1.st Lap": English gets 1st/2nd/3rd, Turkish gets 1./2./3.
 */

const EN_SUFFIXES: Record<Intl.LDMLPluralRule, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
}

export function formatOrdinal(value: number, locale: AppLocale): string {
  if (locale === 'tr') return `${value}.`
  const rule = new Intl.PluralRules('en', { type: 'ordinal' }).select(value)
  return `${value}${EN_SUFFIXES[rule]}`
}

/** "1200 m" — no thousands separator, matching how race distances are written. */
export function formatDistance(metres: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'short',
    useGrouping: false,
  }).format(metres)
}

/** Race time in seconds with two decimals, compact for narrow tables: "6.42s" / "6,42sn". */
export function formatRaceTime(ms: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'second',
    unitDisplay: 'narrow',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ms / 1000)
}
