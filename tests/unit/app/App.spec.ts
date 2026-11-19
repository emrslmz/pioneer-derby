import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useSettingsStore } from '@/stores/settings.store'
import { setViewportWidth } from '../setup'
import { mountApp } from './mount-app'

enableAutoUnmount(afterEach)

describe('App', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete document.documentElement.dataset.theme
    localStorage.clear()
  })

  it('[R1] mounts the Vue app shell with a translated title', () => {
    const { wrapper } = mountApp()
    expect(wrapper.get('[data-testid="app-title"]').text()).toBe('Pioneer Derby')
  })

  it('[X9] renders the Turkish UI when the locale is tr', () => {
    const { wrapper } = mountApp({ locale: 'tr' })
    expect(wrapper.text()).toContain('Altı tur.')
    expect(wrapper.get('[data-testid="generate-button"]').text()).toContain('Program Oluştur')
  })

  it('[T2] shows horse list, track, program and results side by side on desktop', () => {
    setViewportWidth(1440)
    const { wrapper } = mountApp()
    for (const id of ['horses-panel', 'track-panel', 'program-panel', 'results-panel']) {
      expect(wrapper.find(`[data-testid="${id}"]`).exists()).toBe(true)
    }
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })

  it('[X8] provides a skip link to the race track', () => {
    const { wrapper } = mountApp()
    expect(wrapper.get('.skip-link').attributes('href')).toBe('#race-track')
    expect(wrapper.find('#race-track').exists()).toBe(true)
  })

  it('[R3] keyboard: G generates a program and Space starts the race', async () => {
    const { race } = mountApp()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }))
    expect(race.status).toBe('ready')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }))
    expect(race.status).toBe('running')
    race.pause()
  })

  it('[X8] keyboard: ? opens the shortcuts help', async () => {
    const { wrapper } = mountApp()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
    await nextTick()
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.get('[data-testid="shortcuts-list"]').text()).toContain('Space')
  })

  it('[X9] keyboard: L switches language, T cycles theme, 4 sets speed', async () => {
    const { wrapper, race } = mountApp()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }))
    await nextTick()
    expect(document.documentElement.lang).toBe('tr')
    expect(wrapper.get('[data-testid="generate-button"]').text()).toContain('Program Oluştur')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }))
    await nextTick()
    expect(useSettingsStore().theme).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }))
    expect(race.speed).toBe(4)
  })
})
