import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import BaseShortName from '@/shared/ui/BaseShortName.vue'
import { shortName } from '@/shared/utils/names'
import { scrollWithinContainer } from '@/shared/utils/scroll'

describe('shortName', () => {
  it('[R2] keeps the first name and abbreviates the last one', () => {
    expect(shortName('Grace Hopper')).toBe('Grace H.')
    expect(shortName('John von Neumann')).toBe('John N.')
    expect(shortName('Tim Berners-Lee')).toBe('Tim B.')
    expect(shortName('Karen Spärck Jones')).toBe('Karen J.')
    expect(shortName('  Ada   Lovelace ')).toBe('Ada L.')
    expect(shortName('Plato')).toBe('Plato')
  })

  it('[X8] BaseShortName shows the short form, with the full name on hover and for screen readers', () => {
    const wrapper = mount(BaseShortName, { props: { name: 'Margaret Hamilton' } })
    expect(wrapper.get('.short-name__visible').text()).toBe('Margaret H.')
    // Accessible name starts with the visible text (WCAG 2.5.3), then the full name.
    expect(wrapper.text()).toBe('Margaret H. (Margaret Hamilton)')
    const plain = mount(BaseShortName, { props: { name: 'Plato' } })
    expect(plain.text()).toBe('Plato')
    expect(plain.find('.tooltip-trigger').exists()).toBe(false)
  })
})

describe('scrollWithinContainer', () => {
  function layout(scrollable: boolean) {
    const container = document.createElement('div')
    const item = document.createElement('div')
    container.append(item)
    document.body.append(container)
    Object.defineProperty(container, 'scrollHeight', { value: scrollable ? 1000 : 100 })
    Object.defineProperty(container, 'clientHeight', { value: 100 })
    container.scrollTop = 20
    container.getBoundingClientRect = () => ({ top: 50 }) as DOMRect
    item.getBoundingClientRect = () => ({ top: 450 }) as DOMRect
    const scrollTo = vi.fn<(options: ScrollToOptions) => void>()
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    return { item, scrollTo, pageScroll, container }
  }

  it('[R4] scrolls the list container to the item, never the page', () => {
    const { item, scrollTo, pageScroll, container } = layout(true)
    scrollWithinContainer(item, false)
    expect(scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'auto' })
    expect(pageScroll).not.toHaveBeenCalled()
    container.remove()
  })

  it('[R4] does nothing when no ancestor scrolls (stacked layouts)', () => {
    const { item, scrollTo, pageScroll, container } = layout(false)
    scrollWithinContainer(item)
    expect(scrollTo).not.toHaveBeenCalled()
    expect(pageScroll).not.toHaveBeenCalled()
    container.remove()
  })
})
