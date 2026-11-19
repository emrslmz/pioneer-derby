import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseButton from '@/shared/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('[T2] renders a type="button" with its label and emits clicks', async () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Start' } })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toContain('Start')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('[X8] exposes its keyboard shortcut to assistive tech', () => {
    const wrapper = mount(BaseButton, { props: { shortcut: 'G' }, slots: { default: 'Go' } })
    expect(wrapper.attributes('aria-keyshortcuts')).toBe('G')
    expect(wrapper.get('kbd').attributes('aria-hidden')).toBe('true')
  })

  it('[T2] icon-only buttons hide the label and keep the caller aria-label', () => {
    const wrapper = mount(BaseButton, {
      props: { icon: 'keyboard', iconOnly: true },
      attrs: { 'aria-label': 'Shortcuts' },
    })
    expect(wrapper.find('.button__label').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('Shortcuts')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('[R4] a disabled button does not emit clicks', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true }, slots: { default: 'Start' } })
    await wrapper.trigger('click')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
