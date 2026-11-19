import { createI18n } from 'vue-i18n'
import { readStorage, writeStorage } from '@/shared/utils/storage'
import en from './locales/en.json'
import tr from './locales/tr.json'

/** `en.json` is the source of truth; every other locale must have exactly the same keys. */
export type MessageSchema = typeof en

export const SUPPORTED_LOCALES = ['en', 'tr'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'en'
export const LOCALE_STORAGE_KEY = 'pioneer-derby:locale'

const messages: Record<AppLocale, MessageSchema> = { en, tr }

export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Initial locale: saved choice → first supported browser language → English. */
export function detectLocale(
  saved: string | null = readStorage(LOCALE_STORAGE_KEY),
  browserLanguages: readonly string[] = globalThis.navigator?.languages ?? [],
): AppLocale {
  if (isSupportedLocale(saved)) return saved
  for (const language of browserLanguages) {
    const base = language.toLowerCase().split('-')[0]
    if (isSupportedLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export function createAppI18n(locale: AppLocale = detectLocale()) {
  return createI18n<[MessageSchema], AppLocale, false>({
    legacy: false,
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    messages,
  })
}

export type AppI18n = ReturnType<typeof createAppI18n>

/** Switches the UI language, keeps `<html lang>` in sync (screen readers) and persists the choice. */
export function applyLocale(i18n: AppI18n, locale: AppLocale): void {
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') document.documentElement.lang = locale
  writeStorage(LOCALE_STORAGE_KEY, locale)
}
