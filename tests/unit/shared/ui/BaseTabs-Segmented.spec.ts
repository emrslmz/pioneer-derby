import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import BaseTabs from '@/shared/ui/BaseTabs.vue'
import { nextIndex } from '@/shared/ui/tabs'

const tabs = [
  { id: 'horses', label: 'Horses' },
  { id: 'program', label: 'Program' },
  { id: 'results', label: 'Results' },
]

describe('BaseTabs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('[X8] follows the WAI-ARIA tabs pattern', () => {
    const wrapper = mount(BaseTabs, {
      props: { tabs, group: 'g', label: 'Sections', modelValue: 'program' },
    })
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Sections')
    const selected = wrapper.get('[aria-selected="true"]')
    expect(selected.text()).toBe('Program')
    expect(selected.attributes('tabindex')).toBe('0')
    expect(selected.attributes('aria-controls')).toBe('g-panel-program')
    expect(wrapper.findAll('[tabindex="-1"]')).toHaveLength(2)
  })

  it('[X8] arrow keys move selection and focus; clicks select', async () => {
    const wrapper = mount(BaseTabs, {
      props: {
        tabs,
        group: 'g',
        label: 'Sections',
        modelValue: 'program',
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      },
      attachTo: document.body,
    })
    await wrapper.get('[aria-selected="true"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe('results')
    expect(document.activeElement?.textContent).toBe('Results')

    await wrapper.findAll('[role="tab"]')[0]!.trigger('click')
    expect(wrapper.props('modelValue')).toBe('horses')

    await wrapper.get('[aria-selected="true"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.props('modelValue')).toBe('horses')
  })

  it('[X8] keyboard navigation wraps and supports Home / End', () => {
    expect(nextIndex('ArrowRight', 2, 3)).toBe(0)
    expect(nextIndex('ArrowLeft', 0, 3)).toBe(2)
    expect(nextIndex('ArrowDown', 0, 3)).toBe(1)
    expect(nextIndex('ArrowUp', 1, 3)).toBe(0)
    expect(nextIndex('Home', 2, 3)).toBe(0)
    expect(nextIndex('End', 0, 3)).toBe(2)
    expect(nextIndex('a', 0, 3)).toBeNull()
  })
})

describe('BaseSegmentedControl', () => {
  it('[X8] is a radio group whose arrows change the value', async () => {
    const wrapper = mount(BaseSegmentedControl<number>, {
      props: {
        label: 'Race speed',
        options: [
          { value: 1, label: '1×' },
          { value: 2, label: '2×' },
          { value: 4, label: '4×' },
        ],
        modelValue: 1,
        'onUpdate:modelValue': (value: number) => wrapper.setProps({ modelValue: value }),
      },
    })
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Race speed')
    expect(wrapper.get('[aria-checked="true"]').text()).toBe('1×')

    await wrapper.get('[aria-checked="true"]').trigger('keydown', { key: 'End' })
    expect(wrapper.props('modelValue')).toBe(4)

    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    expect(wrapper.props('modelValue')).toBe(2)

    await wrapper.get('[aria-checked="true"]').trigger('keydown', { key: 'x' })
    expect(wrapper.props('modelValue')).toBe(2)
  })
})
