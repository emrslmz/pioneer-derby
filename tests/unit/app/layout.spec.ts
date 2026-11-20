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

  it('[R3] before a program exists, Generate Program draws attention', async () => {
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    const generate = () => wrapper.get('[data-testid="generate-button"]')
    expect(generate().classes()).toContain('header__generate--attention')
    race.generateProgram()
    await nextTick()
    expect(generate().classes()).not.toContain('header__generate--attention')
  })

  it('[R4] header buttons follow the race: Generate → Start → Pause → Resume', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    setViewportWidth(1440)
    const { wrapper, race } = mountApp()
    const generate = () => wrapper.get('[data-testid="generate-button"]')
    const toggle = () => wrapper.get('[data-testid="toggle-button"]')

    expect(toggle().attributes('disabled')).toBeDefined()
    await generate().trigger('click')
    expect(race.status).toBe('ready')
    expect(toggle().text()).toContain('Start')

    await toggle().trigger('click')
    expect(race.status).toBe('running')
    expect(toggle().text()).toContain('Pause')
    expect(generate().attributes('disabled')).toBeDefined()

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
    vi.runAllTimers()
    await nextTick()

    const toggle = wrapper.get('[data-testid="toggle-button"]')
    expect(toggle.text()).toContain('Replay')
    expect(toggle.attributes('disabled')).toBeUndefined()
    await toggle.trigger('click')
    expect(race.status).toBe('ready')
    expect(race.seed).toBe(7)

    race.start()
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

    const speeds = wrapper.findAll('.header__speed [role="radio"]')
    // Turkish formatting: "0,5×"; slow motion is the first option.
    expect(speeds.map((s) => s.text())).toEqual(['0,5×', '1×', '2×', '4×'])
    await speeds[3]!.trigger('click')
    expect(race.speed).toBe(4)
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
    expect(announcer().text()).toBe('Round finished. 2nd Lap – 1400 m starts shortly.')

    vi.runAllTimers()
    await nextTick()
    expect(announcer().text()).toBe('All rounds finished.')
  })
})
