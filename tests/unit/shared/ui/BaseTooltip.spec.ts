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

describe('BaseTooltip (when truncated)', () => {
  function truncatedSetup(scrollWidth: number) {
    const wrapper = mount(BaseTooltip, {
      props: { text: 'Camgöbeği', whenTruncated: true },
      slots: { default: () => h('span', { 'data-truncate': '' }, 'Camgöbeği') },
      attachTo: document.body,
    })
    const label = wrapper.get('[data-truncate]').element as HTMLElement
    Object.defineProperty(label, 'scrollWidth', { value: scrollWidth })
    Object.defineProperty(label, 'clientWidth', { value: 60 })
    return wrapper
  }

  it('[X8] shows only when the label is cut off with "…"', async () => {
    const fits = truncatedSetup(60)
    await fits.get('.tooltip-trigger').trigger('pointerenter')
    expect(tooltip()).toBeNull()
    fits.unmount()

    const cut = truncatedSetup(90)
    await cut.get('.tooltip-trigger').trigger('pointerenter')
    expect(tooltip()?.textContent?.trim()).toBe('Camgöbeği')
  })

  it('[X8] side="right" opens beside the trigger, for a slim side rail', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BaseTooltip, {
      props: { text: 'Grace Hopper', side: 'right' },
      slots: { default: () => h('button', { type: 'button' }, 'Grace H.') },
      attachTo: document.body,
    })
    wrapper.get('.tooltip-trigger').element.getBoundingClientRect = () =>
      ({ top: 100, bottom: 140, left: 8, right: 60, width: 52, height: 40 }) as DOMRect
    await wrapper.get('.tooltip-trigger').trigger('pointerenter')
    const bubble = tooltip()!
    expect(bubble.classList.contains('tooltip--right')).toBe(true)
    // 8 px to the right of the trigger, centred on its height.
    expect(bubble.style.left).toBe('68px')
    expect(bubble.style.top).toBe('120px')
  })
})
