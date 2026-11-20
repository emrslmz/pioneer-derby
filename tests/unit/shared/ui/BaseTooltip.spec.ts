import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import BaseTooltip from '@/shared/ui/BaseTooltip.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

const tooltip = () => document.querySelector<HTMLElement>('[data-testid="tooltip"]')

function setup() {
  vi.useFakeTimers()
  return mount(BaseTooltip, {
    props: { text: 'Grace Hopper' },
    slots: { default: () => h('button', { type: 'button' }, 'Grace H.') },
    attachTo: document.body,
  })
}

describe('BaseTooltip', () => {
  it('[X8] appears on hover, rendered in <body> so panels cannot clip it', async () => {
    const wrapper = setup()
    expect(tooltip()).toBeNull()
    await wrapper.get('.tooltip-trigger').trigger('pointerenter')
    expect(tooltip()?.textContent?.trim()).toBe('Grace Hopper')
    expect(tooltip()?.parentElement).toBe(document.body)
    expect(tooltip()?.getAttribute('role')).toBe('tooltip')
  })

  it('[X8] appears on keyboard focus too', async () => {
    const wrapper = setup()
    await wrapper.get('button').trigger('focusin')
    expect(tooltip()).not.toBeNull()
  })

  it('[X8] is dismissible with Escape (WCAG 1.4.13)', async () => {
    const wrapper = setup()
    await wrapper.get('.tooltip-trigger').trigger('pointerenter')
    await nextTick()
    // Focus is elsewhere (the tooltip was opened by hover): Escape still dismisses it.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(tooltip()).toBeNull()
  })

  it('[X8] is hoverable: moving onto the tooltip keeps it open; leaving hides it', async () => {
    const wrapper = setup()
    await wrapper.get('.tooltip-trigger').trigger('pointerenter')
    await wrapper.get('.tooltip-trigger').trigger('pointerleave')
    tooltip()!.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(tooltip()).not.toBeNull()

    tooltip()!.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(500)
    await nextTick()
    expect(tooltip()).toBeNull()
  })
})
