/**
 * First paint: a splash (plain HTML in index.html) covers the page until the app has mounted and
 * been on screen for a moment, then fades out while the cards arrive one by one (CSS, gated by
 * `html[data-intro]`). Reduced motion skips all of it.
 */
export const SPLASH_MIN_MS = 750
const SPLASH_FADE_MS = 380
/** Longest we wait for the intro animations before moving on (the tour waits for them). */
const SETTLE_LIMIT_MS = 2500

export interface SplashOptions {
  /** ms since the page started loading (`performance.now()`). */
  now?: () => number
  reducedMotion: boolean
  /** How long the splash stays at least; 0 on a first visit, where a question is waiting. */
  minMs?: number
}

/** Fades the splash out (after a minimum time on screen) and removes it. */
export function dismissSplash({
  now = () => performance.now(),
  reducedMotion,
  minMs = SPLASH_MIN_MS,
}: SplashOptions): Promise<void> {
  const splash = document.getElementById('splash')
  if (!splash) return Promise.resolve()
  if (reducedMotion) {
    splash.remove()
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    setTimeout(
      () => {
        splash.classList.add('splash--hide')
        setTimeout(() => {
          splash.remove()
          resolve()
        }, SPLASH_FADE_MS)
      },
      Math.max(0, minMs - now()),
    )
  })
}

/**
 * Resolves when every animation that will end has ended (the intro cards), so that something
 * measuring the page, like the tour's highlight, sees the cards where they stay.
 */
export async function whenSettled(): Promise<void> {
  const finite = (document.getAnimations?.() ?? []).filter(
    (animation) => animation.effect?.getComputedTiming().iterations !== Infinity,
  )
  if (finite.length === 0) return
  await Promise.race([
    Promise.allSettled(finite.map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, SETTLE_LIMIT_MS)),
  ])
}

/** The intro attribute is only for the first seconds; later animations are unaffected by it. */
export function endIntro(): void {
  delete document.documentElement.dataset.intro
}
