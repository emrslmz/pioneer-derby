import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseDialog from '@/shared/ui/BaseDialog.vue'

function setup(open: boolean) {
  const wrapper = mount(BaseDialog, {
    props: {
      title: 'Keyboard shortcuts',
      closeLabel: 'Close',
      open,
      'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }),
    },
    slots: { default: '<p>Body</p>' },
  })
  return wrapper
}

describe('BaseDialog', () => {
  it('[X8] is labelled by its title and opens / closes with v-model', async () => {
    const wrapper = setup(false)
    const dialog = wrapper.get('dialog')
    expect(dialog.attributes('aria-labelledby')).toBe(wrapper.get('h2').attributes('id'))
    expect(dialog.attributes('open')).toBeUndefined()

    await wrapper.setProps({ open: true })
    expect(dialog.attributes('open')).toBeDefined()

    await wrapper.get('button[aria-label="Close"]').trigger('click')
    expect(wrapper.props('open')).toBe(false)
    expect(dialog.attributes('open')).toBeUndefined()
  })

  it('[X8] closes on a backdrop click or the native close event (Escape)', async () => {
    const wrapper = setup(true)
    await wrapper.get('dialog').trigger('click')
    expect(wrapper.props('open')).toBe(false)

    await wrapper.setProps({ open: true })
    // The browser closes the element first, then fires `close`.
    wrapper.get('dialog').element.removeAttribute('open')
    await wrapper.get('dialog').trigger('close')
    expect(wrapper.props('open')).toBe(false)
  })

  it('[X8] a late native close event does not shut a dialog that was reopened meanwhile', async () => {
    const wrapper = setup(true)
    await wrapper.get('dialog').trigger('close') // the element is still open: it was reopened
    expect(wrapper.props('open')).toBe(true)
  })

  it('[X8] clicks inside the card do not close it', async () => {
    const wrapper = setup(true)
    await wrapper.get('p').trigger('click')
    expect(wrapper.props('open')).toBe(true)
  })

  it('[X8] Escape updates the state at once, so the dialog can be reopened right away', async () => {
    const wrapper = setup(true)
    await wrapper.get('dialog').trigger('cancel') // fired on Escape, before the element closes
    expect(wrapper.props('open')).toBe(false)
  })
})
