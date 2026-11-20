import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/app/App.vue'
import { applyLocale, createAppI18n, type AppLocale } from '@/i18n'
import { analytics } from '@/shared/analytics'
import { useRaceStore } from '@/stores/race.store'
import { dismissSplash, endIntro, whenSettled } from '@/app/splash'
import { startTour } from '@/app/tour/startTour'
import { readTourResumeStep, shouldAutoStartTour } from '@/app/tour/tour'
import { readSeedFromUrl } from '@/shared/utils/seed'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@/styles/main.scss'

const i18n = createAppI18n()
applyLocale(i18n, i18n.global.locale.value)

const pinia = createPinia()
const app = createApp(App).use(pinia).use(i18n)

// A2: horses exist from the first paint; `?seed=` replays a shared game (X11).
useRaceStore(pinia).initialize(readSeedFromUrl())

app.mount('#app')

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Starts the first-visit tour, or resumes it after a reload (a no-op for a returning visitor). */
function launchTour() {
  if (!shouldAutoStartTour()) return
  return startTour({
    t: i18n.global.t as (key: string, named?: Record<string, unknown>) => string,
    reducedMotion,
    source: 'first_visit',
    resumeAt: readTourResumeStep(),
    // The first thing a new visitor is asked: which language (like the header switch does).
    language: {
      current: i18n.global.locale.value,
      choose: (next: AppLocale) => {
        const previous = i18n.global.locale.value
        applyLocale(i18n, next)
        if (next !== previous) analytics.track('language_changed', { from: previous, to: next })
      },
    },
  })
}

if (shouldAutoStartTour() && readTourResumeStep() === null) {
  // A brand-new visitor: the language question is the first thing, so nothing is staged before it.
  // The splash starts fading at once, the cards are already in place, and the question opens as
  // soon as the fonts are in.
  endIntro()
  void dismissSplash({ reducedMotion, minMs: 0 })
  void document.fonts.ready.then(launchTour)
} else {
  // Returning visitors and a tour resumed after a reload: the splash fades out, the cards have
  // arrived, and only then does the tour (if due) start, so its highlight is measured on a settled
  // page.
  void dismissSplash({ reducedMotion })
    .then(() => document.fonts.ready)
    .then(whenSettled)
    .then(() => {
      endIntro()
      return launchTour()
    })
}
