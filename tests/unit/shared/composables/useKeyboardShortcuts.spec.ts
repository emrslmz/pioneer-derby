import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useKeyboardShortcuts } from '@/shared/composables/useKeyboardShortcuts'

function setup() {
  const handlers = { g: vi.fn<() => void>(), space: vi.fn<() => void>(), '?': vi.fn<() => void>() }
  const wrapper = mount(
    defineComponent({
      setup() {
        useKeyboardShortcuts(handlers)
        return () => h('div', [h('input', { id: 'field' }), h('button', { id: 'btn' }, 'x')])
      },
    }),
    { attachTo: document.body },
  )
  return { handlers, wrapper }
}

const press = (target: EventTarget, init: KeyboardEventInit) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))

describe('useKeyboardShortcuts', () => {
  enableAutoUnmount(afterEach)
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('[X8] runs the handler for a single key, case-insensitively', () => {
    const { handlers } = setup()
    press(window, { key: 'G' })
    press(window, { key: '?' })
    expect(handlers.g).toHaveBeenCalledOnce()
    expect(handlers['?']).toHaveBeenCalledOnce()
  })

  it('[X8] ignores keys while typing, with modifiers, or on auto-repeat', () => {
    const { handlers } = setup()
    press(document.getElementById('field')!, { key: 'g' })
    press(window, { key: 'g', ctrlKey: true })
    press(window, { key: 'g', metaKey: true })
    press(window, { key: 'g', repeat: true })
    expect(handlers.g).not.toHaveBeenCalled()
  })

  it('[X8] leaves Space to a focused button so it is not triggered twice', () => {
    const { handlers } = setup()
    press(document.getElementById('btn')!, { key: ' ', code: 'Space' })
    expect(handlers.space).not.toHaveBeenCalled()
    press(document.body, { key: ' ', code: 'Space' })
    expect(handlers.space).toHaveBeenCalledOnce()
  })

  it('[X8] removes the listener on unmount', () => {
    const { handlers, wrapper } = setup()
    wrapper.unmount()
    press(window, { key: 'g' })
    expect(handlers.g).not.toHaveBeenCalled()
  })
})
