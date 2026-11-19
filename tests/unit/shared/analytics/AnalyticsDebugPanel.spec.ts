import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createAppI18n } from '@/i18n'
import { analytics, analyticsLog } from '@/shared/analytics'
import AnalyticsDebugPanel from '@/shared/analytics/AnalyticsDebugPanel.vue'
import { isDebugMode } from '@/shared/utils/debug'

afterEach(() => analyticsLog.clear())

describe('AnalyticsDebugPanel', () => {
  it('[X5] lists events live, newest first, and can be cleared', async () => {
    analyticsLog.clear()
    const wrapper = mount(AnalyticsDebugPanel, { global: { plugins: [createAppI18n('en')] } })
    expect(wrapper.text()).toContain('No events yet.')

    analytics.track('race_started', { seed: 1 })
    analytics.track('race_paused', { roundIndex: 0, elapsedMs: 10 })
    await nextTick()
    const rows = wrapper.findAll('[data-testid="debug-event"]')
    expect(rows.map((r) => r.get('.debug__name').text())).toEqual(['race_paused', 'race_started'])
    expect(rows[1]!.get('.debug__payload').text()).toBe('{"seed":1}')

    await wrapper.get('.debug__clear').trigger('click')
    expect(wrapper.findAll('[data-testid="debug-event"]')).toHaveLength(0)

    await wrapper.get('.debug__toggle').trigger('click')
    expect(wrapper.get('.debug__toggle').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('[X5] is enabled with ?debug=1 only', () => {
    expect(isDebugMode('?debug=1')).toBe(true)
    expect(isDebugMode('?seed=4&debug=1')).toBe(true)
    expect(isDebugMode('?debug=0')).toBe(false)
    expect(isDebugMode('')).toBe(false)
  })
})
