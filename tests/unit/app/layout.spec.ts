import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { setViewportWidth } from '../setup'
import { mountApp } from './mount-app'

enableAutoUnmount(afterEach)

describe('responsive layout & header', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    setViewportWidth(1024)
    vi.useRealTimers()
  })

  it('[T2] tablet: track on top, tables behind tabs', async () => {
    setViewportWidth(900)
    const { wrapper } = mountApp()

    expect(wrapper.find('[data-layout="tablet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="track-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="program-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="horses-panel"]').exists()).toBe(false)

    await wrapper.findAll('[role="tab"]')[0]!.trigger('click')
    expect(wrapper.find('[data-testid="horses-panel"]').exists()).toBe(true)
    const panel = wrapper.get('[role="tabpanel"]')
    expect(panel.attributes('aria-labelledby')).toBe('sections-tab-horses')
  })

  it('[T2] mobile: sections switch from a bottom tab bar', async () => {
    setViewportWidth(375)
    const { wrapper } = mountApp()

    expect(wrapper.find('[data-layout="mobile"]').exists()).toBe(true)
    const nav = wrapper.get('nav.tabbar')
    await nav.findAll('[role="tab"]')[2]!.trigger('click')
    expect(wrapper.find('[data-testid="results-panel"]').exists()).toBe(true)
  })

  it('[R3] the header has no Generate button; the empty Program panel offers it instead', async () => {
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    expect(wrapper.find('header [data-testid="generate-button"]').exists()).toBe(false)
    const empty = wrapper.get('[data-testid="program-panel"] [data-testid="generate-button"]')
    expect(wrapper.get('[data-testid="results-panel"]').text()).toContain('No results yet')

    await empty.trigger('click')
    expect(race.status).toBe('ready')
    expect(wrapper.find('[data-testid="generate-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="change-program-button"]').exists()).toBe(true)
  })

  it('[R3] changing the program asks first, and only a confirmation re-rolls it', async () => {
    setViewportWidth(1440)
    const { wrapper, race } = mountApp({ seed: 7 })
    race.generateProgram()
    await nextTick()
    const before = race.seed

    await wrapper.get('[data-testid="change-program-button"]').trigger('click')
    expect(wrapper.get('dialog[role="alertdialog"]').attributes('open')).toBeDefined()
    await wrapper.get('[data-testid="change-program-cancel"]').trigger('click')
    expect(race.seed).toBe(before)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
    await nextTick()
    expect(wrapper.get('dialog[role="alertdialog"]').attributes('open')).toBeDefined()
    await wrapper.get('[data-testid="change-program-confirm"]').trigger('click')
    expect(race.seed).not.toBe(before)
    expect(race.status).toBe('ready')
  })

  it('[R3] the program cannot be changed while a round is running (A6)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    race.generateProgram()
    race.start()
    await nextTick()
    expect(
      wrapper.get('[data-testid="change-program-button"]').attributes('disabled'),
    ).toBeDefined()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
    await nextTick()
    expect(wrapper.get('dialog[role="alertdialog"]').attributes('open')).toBeUndefined()
  })

  it('[R4] the header button follows the race: Start → Pause → Resume', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    const generate = () => wrapper.get('[data-testid="generate-button"]')
    const change = () => wrapper.get('[data-testid="change-program-button"]')
    const toggle = () => wrapper.get('[data-testid="toggle-button"]')

    expect(toggle().attributes('disabled')).toBeDefined()
    await generate().trigger('click')
    expect(race.status).toBe('ready')
    expect(toggle().text()).toContain('Start')

    await toggle().trigger('click')
    expect(race.status).toBe('running')
    expect(toggle().text()).toContain('Pause')
    expect(change().attributes('disabled')).toBeDefined()

    await toggle().trigger('click')
    expect(toggle().text()).toContain('Resume')
    expect(wrapper.get('[data-testid="race-status"]').text()).toContain('Paused')
  })

  it('[X11] when the program finishes the primary button replays the same race', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    setViewportWidth(1440)
    const { wrapper, race } = mountApp({ seed: 7 })
    race.generateProgram()
    race.start()
    race.setAutoAdvance(true)
    vi.runAllTimers()
    await nextTick()

    const toggle = wrapper.get('[data-testid="toggle-button"]')
    expect(toggle.text()).toContain('Replay')
    expect(toggle.attributes('disabled')).toBeUndefined()
    await toggle.trigger('click')
    expect(race.status).toBe('ready')
    expect(race.seed).toBe(7)

    race.start()
    race.setAutoAdvance(true)
    vi.runAllTimers()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    expect(race.status).toBe('ready')
  })

  it('[X9] the header shows the round in the active language', async () => {
    setViewportWidth(1440)
    const { wrapper, race } = mountApp({ locale: 'tr' })
    race.generateProgram()
    await nextTick()
    expect(wrapper.get('[data-testid="round-caption"]').text()).toBe('Tur 1 / 6 · 1. Tur – 1200 m')
    expect(wrapper.get('[data-testid="track-caption"]').text()).toBe('1. Tur – 1200 m')
  })

  it('[X9] the language switch and speed control update app state', async () => {
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    await wrapper.get('[data-testid="language-switch"] [role="radio"]:last-child').trigger('click')
    expect(document.documentElement.lang).toBe('tr')

    // Speed lives in the track's player bar. Turkish formatting: "0,5×"; slow motion first.
    const speeds = wrapper.findAll('[data-testid="player-speed"] [role="radio"]')
    expect(speeds.map((s) => s.text())).toEqual(['0,5×', '1×', '2×', '4×', '8×'])
    await speeds[4]!.trigger('click')
    expect(race.speed).toBe(8)
    await speeds[0]!.trigger('click')
    expect(race.speed).toBe(0.5)

    await wrapper.get('[data-testid="theme-toggle"]').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('light')
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('[X8] announces race progress to screen readers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { wrapper, race } = mountApp()
    race.setAutoAdvance(false) // manual mode: the break waits and says so
    const announcer = () => wrapper.get('[data-testid="announcer"]')
    expect(announcer().attributes('aria-live')).toBe('polite')

    race.generateProgram()
    await nextTick()
    expect(announcer().text()).toContain('6 rounds')

    race.start()
    await nextTick()
    // The round start is called by the commentary ticker instead.
    expect(announcer().text()).toBe('')

    race.pause()
    await nextTick()
    expect(announcer().text()).toBe('Race paused.')

    race.resume()
    await nextTick()
    expect(announcer().text()).toBe('Race resumed.')

    vi.advanceTimersByTime(race.currentRace!.durationMs + 1)
    await nextTick()
    expect(announcer().text()).toBe(
      'Round finished. Next: 2nd Lap – 1400 m. Press Next round when ready.',
    )

    race.setAutoAdvance(true)
    vi.runAllTimers()
    await nextTick()
    expect(announcer().text()).toBe('All rounds finished.')
  })
})
