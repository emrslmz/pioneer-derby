import { analytics } from '@/shared/analytics'
import { readStorage, writeStorage } from '@/shared/utils/storage'

export const TOUR_STORAGE_KEY = 'pioneer-derby:tour'

/** One stop of the tour. A step without a selector is a centred welcome card. */
export interface TourStep {
  id: 'welcome' | 'program' | 'prediction' | 'start' | 'player' | 'results'
  /** `data-tour` attribute of the element to highlight. */
  target?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export const TOUR_STEPS: readonly TourStep[] = [
  { id: 'welcome' },
  { id: 'program', target: 'program', side: 'left' },
  { id: 'prediction', target: 'prediction', side: 'bottom' },
  { id: 'start', target: 'start', side: 'bottom' },
  { id: 'player', target: 'player', side: 'top' },
  { id: 'results', target: 'results', side: 'left' },
]

/**
 * The language question is asked before the interface has a chosen language, so it is the one text
 * that is deliberately not in the locale files: both languages, each named in itself.
 */
export const LANGUAGE_PROMPT = {
  title: 'Choose your language · Dilini seç',
  choices: [
    { locale: 'en', label: 'English', continue: 'Continue' },
    { locale: 'tr', label: 'Türkçe', continue: 'Devam' },
  ],
} as const

/**
 * What is remembered: nothing (never seen), `progress:N` (stopped at step N, e.g. by a reload) or
 * `1` (finished or skipped). A reload mid-tour resumes at the same step.
 */
const PROGRESS_PREFIX = 'progress:'

/** The tour is for first-time visitors (and for anyone who reloaded in the middle of it). */
export function shouldAutoStartTour(search: string = globalThis.location?.search ?? ''): boolean {
  if (new URLSearchParams(search).get('tour') === '1') return true
  const saved = readStorage(TOUR_STORAGE_KEY)
  return saved === null || saved.startsWith(PROGRESS_PREFIX)
}

/** The step to resume at, or null for a fresh tour (`?tour=1` always starts fresh). */
export function readTourResumeStep(
  search: string = globalThis.location?.search ?? '',
): number | null {
  if (new URLSearchParams(search).get('tour') === '1') return null
  const saved = readStorage(TOUR_STORAGE_KEY)
  if (!saved?.startsWith(PROGRESS_PREFIX)) return null
  const step = Number(saved.slice(PROGRESS_PREFIX.length))
  return Number.isInteger(step) && step >= 0 ? step : null
}

export function saveTourProgress(step: number): void {
  writeStorage(TOUR_STORAGE_KEY, `${PROGRESS_PREFIX}${step}`)
}

export function markTourSeen(): void {
  writeStorage(TOUR_STORAGE_KEY, '1')
}

/** Steps whose target is not on screen (a tab that is not open on a phone) are left out. */
export function isOnScreen(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.getClientRects().length > 0
}

export function resolveSteps(root: ParentNode = document): TourStep[] {
  return TOUR_STEPS.filter(
    (step) => !step.target || isOnScreen(root.querySelector(`[data-tour="${step.target}"]`)),
  )
}

export function trackTourStarted(source: 'first_visit' | 'manual'): void {
  analytics.track('tour_started', { source })
}
