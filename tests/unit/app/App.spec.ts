import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '@/app/App.vue'
import { createAppI18n } from '@/i18n'

describe('App', () => {
  it('[R1] mounts the Vue app shell with a translated title', () => {
    const wrapper = mount(App, { global: { plugins: [createAppI18n('en')] } })

    expect(wrapper.get('[data-testid="app-title"]').text()).toBe('Pioneer Derby')
  })

  it('[X9] renders the Turkish tagline when the locale is tr', () => {
    const wrapper = mount(App, { global: { plugins: [createAppI18n('tr')] } })

    expect(wrapper.text()).toContain('Altı tur.')
  })
})
