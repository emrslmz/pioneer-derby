import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'

describe('BaseColorSwatch', () => {
  it('[C2] shows the colour as a dot plus a text label (colour is never the only cue)', () => {
    const wrapper = mount(BaseColorSwatch, { props: { hex: '#e53935', label: 'Red' } })
    expect(wrapper.get('.swatch__dot').attributes('style')).toContain('#e53935')
    expect(wrapper.get('.swatch__dot').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('Red')
  })

  it('[X8] can hide the label visually while keeping it for screen readers', () => {
    const wrapper = mount(BaseColorSwatch, {
      props: { hex: '#000', label: 'Black', hideLabel: true },
    })
    expect(wrapper.get('.visually-hidden').text()).toBe('Black')
  })
})
