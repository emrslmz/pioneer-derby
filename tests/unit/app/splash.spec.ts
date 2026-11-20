import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissSplash, endIntro, SPLASH_MIN_MS, whenSettled } from '@/app/splash'

beforeEach(() => {
  document.body.innerHTML = '<div id="splash"></div>'
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.intro
})

describe('first-load splash', () => {
  it('[X10] stays for a minimum time, then fades out and is removed', async () => {
    const done = vi.fn<() => void>()
    void dismissSplash({ now: () => 200, reducedMotion: false }).then(done)

    vi.advanceTimersByTime(SPLASH_MIN_MS - 200 - 1)
    expect(document.getElementById('splash')?.classList.contains('splash--hide')).toBe(false)
    vi.advanceTimersByTime(1)
    expect(document.getElementById('splash')?.classList.contains('splash--hide')).toBe(true)
    expect(document.getElementById('splash')).not.toBeNull() // fading

    await vi.advanceTimersByTimeAsync(400)
    expect(document.getElementById('splash')).toBeNull()
    expect(done).toHaveBeenCalledOnce()
  })

  it('[X10] a page that took longer than the minimum to load starts fading at once', async () => {
    void dismissSplash({ now: () => 5000, reducedMotion: false })
    await vi.advanceTimersByTimeAsync(0)
    expect(document.getElementById('splash')?.classList.contains('splash--hide')).toBe(true)
  })

  it('[X9] a first visit does not wait: with a minimum of 0 the splash starts fading at once', async () => {
    void dismissSplash({ now: () => 120, reducedMotion: false, minMs: 0 })
    await vi.advanceTimersByTimeAsync(0)
    expect(document.getElementById('splash')?.classList.contains('splash--hide')).toBe(true)
  })

  it('[X8] reduced motion removes it immediately, with no delay', async () => {
    await dismissSplash({ now: () => 0, reducedMotion: true })
    expect(document.getElementById('splash')).toBeNull()
  })

  it('[X10] does nothing when there is no splash', async () => {
    document.body.innerHTML = ''
    await expect(dismissSplash({ reducedMotion: false })).resolves.toBeUndefined()
  })

  it('[X10] the intro attribute is only for the first seconds', () => {
    document.documentElement.dataset.intro = ''
    endIntro()
    expect(document.documentElement.hasAttribute('data-intro')).toBe(false)
  })

  it('[X10] waits for finite animations, never for infinite ones', async () => {
    const make = (iterations: number, finished: Promise<unknown>) =>
      ({
        effect: { getComputedTiming: () => ({ iterations }) },
        finished,
      }) as unknown as Animation
    let end!: () => void
    const ends = new Promise<void>((resolve) => (end = resolve))
    document.getAnimations = () => [make(1, ends), make(Infinity, new Promise(() => {}))]

    let settled = false
    void whenSettled().then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(100)
    expect(settled).toBe(false)
    end()
    await vi.advanceTimersByTimeAsync(0)
    expect(settled).toBe(true)
    delete (document as { getAnimations?: unknown }).getAnimations
  })

  it('[X10] gives up waiting after a limit, so a stuck animation cannot hold the app back', async () => {
    document.getAnimations = () =>
      [
        {
          effect: { getComputedTiming: () => ({ iterations: 1 }) },
          finished: new Promise(() => {}),
        },
      ] as unknown as Animation[]
    let settled = false
    void whenSettled().then(() => (settled = true))
    await vi.advanceTimersByTimeAsync(2600)
    expect(settled).toBe(true)
    delete (document as { getAnimations?: unknown }).getAnimations
  })
})
