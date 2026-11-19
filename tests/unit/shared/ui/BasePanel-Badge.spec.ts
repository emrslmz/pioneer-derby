import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'

describe('BasePanel', () => {
  it('[X8] is a region labelled by its heading', () => {
    const wrapper = mount(BasePanel, {
      props: { title: 'Program', tone: 'program' },
      slots: { default: '<p>body</p>', actions: '<button>x</button>' },
    })
    const heading = wrapper.get('h2')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(heading.attributes('id'))
    expect(heading.text()).toBe('Program')
    expect(wrapper.classes()).toContain('panel--program')
    expect(wrapper.find('.panel__actions button').exists()).toBe(true)
  })

  it('[T2] can scroll its body inside the panel', () => {
    const wrapper = mount(BasePanel, { props: { title: 'Results', scroll: true } })
    expect(wrapper.get('.panel__body').classes()).toContain('panel__body--scroll')
  })
})

describe('BaseBadge', () => {
  it('[T2] renders a toned label with an optional pulsing dot', () => {
    const wrapper = mount(BaseBadge, {
      props: { tone: 'live', pulse: true },
      slots: { default: 'Live' },
    })
    expect(wrapper.text()).toBe('Live')
    expect(wrapper.classes()).toContain('badge--live')
    expect(wrapper.get('.badge__dot').classes()).toContain('badge__dot--pulse')
  })
})
