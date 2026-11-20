import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { setViewportWidth } from '../setup'
import { mountApp } from './mount-app'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
  setViewportWidth(1024)
  vi.useRealTimers()
})

const dialog = () =>
  document.querySelector('dialog[aria-labelledby]:has([data-testid="program-summary"])')

function setup() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  setViewportWidth(1440)
  const mounted = mountApp()
  mounted.race.generateProgram()
  mounted.race.start()
  mounted.race.setAutoAdvance(true)
  return mounted
}

describe('program summary in the app', () => {
  it('[X13] opens by itself a moment after the last round, not before', async () => {
    const { race } = setup()
    // Everything runs, but the summary's own delay has not passed yet.
    vi.advanceTimersByTime(900_000)
    expect(race.status).toBe('finished')
    await vi.advanceTimersByTimeAsync(0)
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false)

    await vi.advanceTimersByTimeAsync(2000)
    await nextTick()
    expect(dialog()?.hasAttribute('open')).toBe(true)
  })

  it('[X13] stays closed while the program is running', async () => {
    const { race } = setup()
    vi.advanceTimersByTime(60_000)
    await nextTick()
    expect(race.status).not.toBe('finished')
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false)
  })

  it('[X13] the Results panel offers the summary once the program is finished, and reopens it', async () => {
    const { wrapper, race } = setup()
    expect(wrapper.find('[data-testid="summary-open"]').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(900_000)
    await vi.advanceTimersByTimeAsync(2000)
    expect(race.status).toBe('finished')
    // Close it, then ask for it again from the button.
    // jsdom has no dialog.close(): do what the browser does on Escape.
    dialog()!.removeAttribute('open')
    dialog()!.dispatchEvent(new Event('close'))
    await nextTick()
    expect(dialog()?.hasAttribute('open')).toBe(false)

    await wrapper.get('[data-testid="summary-open"]').trigger('click')
    await nextTick()
    expect(dialog()?.hasAttribute('open')).toBe(true)
  })

  it('[X11] replaying from the summary starts the same program again and closes it', async () => {
    const { race } = setup()
    await vi.advanceTimersByTimeAsync(900_000)
    await vi.advanceTimersByTimeAsync(2000)
    const seed = race.seed
    ;(document.querySelector('[data-testid="summary-replay"]') as HTMLButtonElement).click()
    await nextTick()
    expect(race.status).toBe('ready')
    expect(race.seed).toBe(seed)
    expect(dialog()?.hasAttribute('open') ?? false).toBe(false)
  })
})
