import { analytics } from '@/shared/analytics'
import type { AppLocale } from '@/i18n'
import {
  LANGUAGE_PROMPT,
  markTourSeen,
  resolveSteps,
  saveTourProgress,
  trackTourStarted,
} from './tour'

export interface StartTourOptions {
  /** vue-i18n `t`: texts come from the locale files like everything else. */
  t: (key: string, named?: Record<string, unknown>) => string
  /** Reduced motion: no animated highlight, no smooth scrolling. */
  reducedMotion: boolean
  source: 'first_visit' | 'manual'
  /** First visit only: ask the language first. `current` is pre-selected (browser language). */
  language?: { current: AppLocale; choose: (locale: AppLocale) => void }
  /** Resume a tour that a reload interrupted, at this step (no language question again). */
  resumeAt?: number | null
}

type DriverFactory = typeof import('driver.js').driver

/**
 * For a step without an element, driver.js highlights an invisible 0×0 <div> and puts
 * `aria-expanded`, `aria-haspopup` and `aria-controls` on it. A bare div may not have them (axe:
 * aria-allowed-attr), and nothing is focusable there, so they are removed. driver.js sets them
 * right after it renders the popover, so this also runs from `onHighlighted` and a frame later.
 */
export function cleanDummyElementSoon(): void {
  cleanDummyElement()
  requestAnimationFrame(() => cleanDummyElement())
}

export function cleanDummyElement(root: ParentNode = document): void {
  const dummy = root.querySelector('#driver-dummy-element')
  for (const name of ['aria-expanded', 'aria-haspopup', 'aria-controls']) {
    dummy?.removeAttribute(name)
  }
}

/**
 * Step zero: pick a language, then Continue. Choosing applies the language straight away, so the
 * page behind the overlay switches too. Resolves with the final pick, or null if dismissed.
 */
function askLanguage(
  driver: DriverFactory,
  { current, choose }: NonNullable<StartTourOptions['language']>,
  reducedMotion: boolean,
): Promise<AppLocale | null> {
  return new Promise((resolve) => {
    let selected = current
    let settled = false
    const settle = (value: AppLocale | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const chooser = driver({
      animate: !reducedMotion,
      popoverClass: 'pd-tour pd-tour--language',
      showButtons: ['close'],
      allowClose: true,
      overlayOpacity: 0.72,
      steps: [{ popover: { title: LANGUAGE_PROMPT.title, description: '' } }],
      onHighlighted: cleanDummyElementSoon,
      onPopoverRender: (popover) => {
        cleanDummyElementSoon()
        const subtitle = document.createElement('p')
        subtitle.className = 'pd-tour__subtitle'
        subtitle.textContent = LANGUAGE_PROMPT.subtitle
        const row = document.createElement('div')
        row.className = 'pd-tour__languages'
        const next = document.createElement('button')
        next.type = 'button'
        next.className = 'pd-tour__continue'
        next.dataset.testid = 'tour-language-continue'

        const buttons = LANGUAGE_PROMPT.choices.map(({ locale, label }) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.lang = locale
          button.textContent = label
          button.dataset.testid = `tour-language-${locale}`
          button.addEventListener('click', () => {
            selected = locale
            choose(locale)
            refresh()
          })
          row.append(button)
          return { locale, button }
        })

        function refresh() {
          for (const { locale, button } of buttons) {
            button.setAttribute('aria-pressed', String(locale === selected))
          }
          const choice = LANGUAGE_PROMPT.choices.find((item) => item.locale === selected)
          next.textContent = choice?.continue ?? ''
          next.lang = selected
        }
        refresh()

        next.addEventListener('click', () => {
          chooser.destroy()
          settle(selected)
        })
        popover.description.replaceChildren(subtitle, row, next)
        // driver.js hides an empty description; this one holds the buttons.
        popover.description.style.display = 'block'
        buttons.find(({ locale }) => locale === selected)?.button.focus()
      },
      // Close button, Escape or a click outside. (`onDestroyed` is not called for a step without
      // an element, so the hook that always runs is used.)
      onDestroyStarted: () => {
        chooser.destroy()
        settle(null)
      },
    })
    chooser.drive()
  })
}

/**
 * The first-visit product tour (driver.js). The library and its stylesheet are loaded on demand,
 * so returning visitors never download them. The current step is remembered, so a reload resumes
 * where it stopped; finishing or closing the tour marks it seen for good.
 */
export async function startTour({
  t,
  reducedMotion,
  source,
  language,
  resumeAt = null,
}: StartTourOptions): Promise<boolean> {
  const steps = resolveSteps()
  if (steps.length === 0) return false

  const [{ driver }] = await Promise.all([import('driver.js'), import('driver.js/dist/driver.css')])
  trackTourStarted(source)

  if (language && resumeAt === null) {
    if ((await askLanguage(driver, language, reducedMotion)) === null) {
      // Dismissed before choosing: the visitor does not want the tour.
      markTourSeen()
      analytics.track('tour_skipped', { atStep: 0, steps: steps.length })
      return true
    }
    // Let the language popover finish leaving the page before the tour opens its own.
    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  const first = Math.min(Math.max(resumeAt ?? 0, 0), steps.length - 1)
  saveTourProgress(first)
  let finished = false
  const tour = driver({
    animate: !reducedMotion,
    smoothScroll: !reducedMotion,
    allowClose: true,
    allowKeyboardControl: true,
    showProgress: true,
    progressText: '{{current}} / {{total}}',
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    popoverClass: 'pd-tour',
    stagePadding: 6,
    stageRadius: 12,
    overlayOpacity: 0.72,
    steps: steps.map((step) => ({
      element: step.target ? `[data-tour="${step.target}"]` : undefined,
      popover: {
        title: t(`tour.steps.${step.id}.title`),
        description: t(`tour.steps.${step.id}.body`),
        side: step.side,
        align: 'center',
      },
    })),
    onHighlighted: cleanDummyElementSoon,
    onPopoverRender: cleanDummyElementSoon,
    // A reload resumes at the step being shown. The step is saved when it is left, from the index
    // we are moving to (driver.js hooks run before its own state changes).
    onNextClick: (_element, _step, { driver: active }) => {
      if (active.isLastStep()) finished = true
      else saveTourProgress((active.getActiveIndex() ?? 0) + 1)
      active.moveNext()
    },
    onPrevClick: (_element, _step, { driver: active }) => {
      saveTourProgress(Math.max(0, (active.getActiveIndex() ?? 0) - 1))
      active.movePrevious()
    },
    // The Done button on the last step and Close / Escape both end here.
    onDestroyStarted: (_element, _step, { state, driver: active }) => {
      markTourSeen()
      if (finished) analytics.track('tour_completed', { steps: steps.length })
      else
        analytics.track('tour_skipped', {
          atStep: (state.activeIndex ?? 0) + 1,
          steps: steps.length,
        })
      active.destroy()
    },
  })
  tour.drive(first)
  return true
}
