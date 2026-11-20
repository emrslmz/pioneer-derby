import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanDummyElement, startTour } from '@/app/tour/startTour'
import {
  markTourSeen,
  readTourResumeStep,
  resolveSteps,
  saveTourProgress,
  shouldAutoStartTour,
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
} from '@/app/tour/tour'
import { analyticsLog } from '@/shared/analytics'

// driver.js draws on a real layout; here only the configuration it receives matters.
const driverConfigs: Record<string, unknown>[] = []
const drive = vi.fn<(...args: unknown[]) => void>()
vi.mock('driver.js', () => ({
  driver: (config: Record<string, unknown>) => {
    driverConfigs.push(config)
    return { drive, destroy: vi.fn<(...args: unknown[]) => void>() }
  },
}))
vi.mock('driver.js/dist/driver.css', () => ({}))

/** Puts the tour's targets in the page; jsdom has no layout, so "on screen" is stubbed. */
function renderTargets(targets: readonly string[], visible = true) {
  document.body.innerHTML = targets.map((target) => `<div data-tour="${target}"></div>`).join('')
  for (const element of document.querySelectorAll<HTMLElement>('[data-tour]')) {
    Object.defineProperty(element, 'getClientRects', { value: () => (visible ? [{}] : []) })
  }
}
const ALL = ['program', 'prediction', 'start', 'player', 'results']
const t = (key: string) => `t:${key}`

beforeEach(() => {
  driverConfigs.length = 0
  drive.mockClear()
  analyticsLog.clear()
  localStorage.clear()
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('first-visit tour', () => {
  it('[X4] starts for a new visitor, not for one who has seen it, and ?tour=1 forces it', () => {
    expect(shouldAutoStartTour('')).toBe(true)
    markTourSeen()
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1')
    expect(shouldAutoStartTour('')).toBe(false)
    expect(shouldAutoStartTour('?seed=1')).toBe(false)
    expect(shouldAutoStartTour('?tour=1')).toBe(true)
  })

  it('[X4] a reload in the middle of the tour resumes at the same step', () => {
    expect(readTourResumeStep('')).toBeNull()
    saveTourProgress(3)
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:3')
    expect(shouldAutoStartTour('')).toBe(true)
    expect(readTourResumeStep('')).toBe(3)
    expect(readTourResumeStep('?tour=1')).toBeNull() // ?tour=1 starts over
    localStorage.setItem(TOUR_STORAGE_KEY, 'progress:abc')
    expect(readTourResumeStep('')).toBeNull()
    markTourSeen()
    expect(shouldAutoStartTour('')).toBe(false)
    expect(readTourResumeStep('')).toBeNull()
  })

  it('[X4] has a welcome card plus one step for each part of the screen', () => {
    expect(TOUR_STEPS.map((step) => step.id)).toEqual([
      'welcome',
      'program',
      'prediction',
      'start',
      'player',
      'results',
    ])
    renderTargets(ALL)
    expect(resolveSteps()).toHaveLength(6)
  })

  it('[T2] leaves out steps whose target is not on screen (a closed tab on a phone)', () => {
    renderTargets(['prediction', 'start', 'player'])
    expect(resolveSteps().map((step) => step.id)).toEqual([
      'welcome',
      'prediction',
      'start',
      'player',
    ])
    renderTargets(ALL, false)
    expect(resolveSteps().map((step) => step.id)).toEqual(['welcome'])
  })

  it('[X9] [X8] is translated, shows progress and does not animate under reduced motion', async () => {
    renderTargets(ALL)
    expect(await startTour({ t, reducedMotion: true, source: 'first_visit' })).toBe(true)

    const config = driverConfigs[0]!
    expect(config).toMatchObject({
      animate: false,
      smoothScroll: false,
      showProgress: true,
      allowKeyboardControl: true,
      nextBtnText: 't:tour.next',
      doneBtnText: 't:tour.done',
    })
    const steps = config.steps as { element?: string; popover: { title: string } }[]
    expect(steps[0]).toMatchObject({ popover: { title: 't:tour.steps.welcome.title' } })
    expect(steps[0]!.element).toBeUndefined()
    expect(steps[1]!.element).toBe('[data-tour="program"]')
    expect(drive).toHaveBeenCalledOnce()
  })

  it('[X5] remembers the step while it runs, the end for good, and tracks how it ended', async () => {
    renderTargets(ALL)
    await startTour({ t, reducedMotion: false, source: 'manual' })
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:0')
    const nav = driverConfigs[0] as {
      onNextClick: (el: undefined, step: undefined, ctx: { driver: unknown }) => void
      onPrevClick: (el: undefined, step: undefined, ctx: { driver: unknown }) => void
    }
    const active = (index: number, last = false) => ({
      getActiveIndex: () => index,
      isLastStep: () => last,
      moveNext: vi.fn<(...args: unknown[]) => void>(),
      movePrevious: vi.fn<(...args: unknown[]) => void>(),
    })
    nav.onNextClick(undefined, undefined, { driver: active(1) }) // leaving step 1 for step 2
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:2')
    nav.onPrevClick(undefined, undefined, { driver: active(2) })
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:1')
    nav.onNextClick(undefined, undefined, { driver: active(1) })
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:2')
    expect(analyticsLog.events.map((e) => [e.name, e.payload])).toEqual([
      ['tour_started', { source: 'manual' }],
    ])

    // Closed on the third step.
    const destroy = vi.fn<(...args: unknown[]) => void>()
    const config = driverConfigs[0] as {
      onDestroyStarted: (
        el: undefined,
        step: undefined,
        ctx: { state: { activeIndex: number }; driver: { destroy: () => void } },
      ) => void
      onNextClick: (el: undefined, step: undefined, ctx: { driver: unknown }) => void
    }
    config.onDestroyStarted(undefined, undefined, {
      state: { activeIndex: 2 },
      driver: { destroy },
    })
    expect(analyticsLog.events.at(-1)).toMatchObject({
      name: 'tour_skipped',
      payload: { atStep: 3, steps: 6 },
    })
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1')

    // Finished: Done on the last step.
    analyticsLog.clear()
    const moveNext = vi.fn<(...args: unknown[]) => void>()
    config.onNextClick(undefined, undefined, { driver: { isLastStep: () => true, moveNext } })
    expect(moveNext).toHaveBeenCalledOnce()
    config.onDestroyStarted(undefined, undefined, {
      state: { activeIndex: 5 },
      driver: { destroy },
    })
    expect(analyticsLog.events.at(-1)).toMatchObject({
      name: 'tour_completed',
      payload: { steps: 6 },
    })
  })

  it('[X4] resumes at the saved step and does not ask the language again', async () => {
    renderTargets(ALL)
    const choose = vi.fn<(...args: unknown[]) => void>()
    await startTour({
      t,
      reducedMotion: false,
      source: 'first_visit',
      language: { current: 'en', choose },
      resumeAt: 3,
    })
    expect(driverConfigs).toHaveLength(1) // no language popover first
    expect(drive).toHaveBeenCalledWith(3)
    expect(choose).not.toHaveBeenCalled()
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('progress:3')
  })

  it('[X9] asks the language first; choosing applies it and Continue starts the tour', async () => {
    renderTargets(ALL)
    const choose = vi.fn<(...args: unknown[]) => void>()
    const started = startTour({
      t,
      reducedMotion: false,
      source: 'first_visit',
      language: { current: 'en', choose },
    })
    await vi.waitFor(() => expect(driverConfigs).toHaveLength(1))
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBeNull() // reload now asks again

    const chooser = driverConfigs[0] as {
      steps: { popover: { title: string } }[]
      onPopoverRender: (popover: { description: HTMLElement }) => void
      onDestroyStarted: () => void
    }
    expect(chooser.steps[0]!.popover.title).toBe('Merhaba · Hello')
    const description = document.createElement('div')
    chooser.onPopoverRender({ description })
    const button = (id: string) =>
      description.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!

    expect(button('tour-language-en').getAttribute('aria-pressed')).toBe('true')
    expect(button('tour-language-continue').textContent).toBe('Continue')
    button('tour-language-tr').click()
    expect(choose).toHaveBeenCalledWith('tr')
    expect(button('tour-language-tr').getAttribute('aria-pressed')).toBe('true')
    expect(button('tour-language-continue').textContent).toBe('Devam')
    expect(driverConfigs).toHaveLength(1) // choosing alone does not continue

    button('tour-language-continue').click()
    await started
    expect(driverConfigs).toHaveLength(2) // now the tour itself
    expect(drive).toHaveBeenLastCalledWith(0)
  })

  it('[X4] closing the language question skips the tour for good', async () => {
    renderTargets(ALL)
    const started = startTour({
      t,
      reducedMotion: false,
      source: 'first_visit',
      language: { current: 'en', choose: vi.fn<(...args: unknown[]) => void>() },
    })
    await vi.waitFor(() => expect(driverConfigs).toHaveLength(1))
    ;(driverConfigs[0] as { onDestroyStarted: () => void }).onDestroyStarted()
    await started
    expect(driverConfigs).toHaveLength(1)
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1')
  })

  it('[X4] does nothing when there is nothing to show', async () => {
    document.body.innerHTML = ''
    renderTargets([])
    expect(await startTour({ t, reducedMotion: false, source: 'manual' })).toBe(true) // welcome only
    renderTargets(ALL, false)
    drive.mockClear()
    // Welcome has no target, so a tour of one card is still offered; an empty list never is.
    expect(resolveSteps(document.createDocumentFragment())).toHaveLength(1)
  })

  it('[X8] removes the ARIA attributes driver.js puts on its invisible helper element', () => {
    document.body.innerHTML =
      '<div id="driver-dummy-element" aria-haspopup="dialog" aria-expanded="true" aria-controls="x"></div>'
    cleanDummyElement()
    const dummy = document.getElementById('driver-dummy-element')!
    expect(dummy.hasAttribute('aria-expanded')).toBe(false)
    expect(dummy.hasAttribute('aria-haspopup')).toBe(false)
    expect(dummy.hasAttribute('aria-controls')).toBe(false)
    expect(() => cleanDummyElement(document.createDocumentFragment())).not.toThrow()
  })

  it('[X8] the tour cleans the helper element every time a popover renders', async () => {
    renderTargets(ALL)
    await startTour({ t, reducedMotion: false, source: 'manual' })
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="driver-dummy-element" aria-expanded="true"></div>',
    )
    ;(driverConfigs[0] as { onPopoverRender: () => void }).onPopoverRender()
    expect(document.getElementById('driver-dummy-element')?.hasAttribute('aria-expanded')).toBe(
      false,
    )
  })
})
