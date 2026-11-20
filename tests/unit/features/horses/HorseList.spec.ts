import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import ConditionBar from '@/features/horses/components/ConditionBar.vue'
import HorseList from '@/features/horses/components/HorseList.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { mountFeature } from '../mount'

const bodyRows = (wrapper: ReturnType<typeof mountFeature>['wrapper']) =>
  wrapper.findAll('tbody tr')

describe('HorseList', () => {
  it('[R2] lists all 20 horses with number, name, condition and colour name', () => {
    const { wrapper } = mountFeature(HorseList)
    const horses = useHorsesStore().horses

    expect(wrapper.get('h2').text()).toBe('Horse List (1–20)')
    expect(wrapper.findAll('th').map((th) => th.text())).toEqual([
      'No',
      'Name',
      'Condition',
      'Color',
    ])
    expect(bodyRows(wrapper)).toHaveLength(20)

    const first = bodyRows(wrapper)[0]!
    const horse = horses[0]!
    expect(first.text()).toContain(horse.name)
    expect(first.text()).toContain(String(horse.condition))
    expect(first.find('.swatch__label').text()).toMatch(/^[A-Z][a-z]+$/)
  })

  it('[R2] abbreviates surnames visually but keeps the full name for hover and screen readers', async () => {
    const { wrapper } = mountFeature(HorseList, { attachTo: document.body })
    const horse = useHorsesStore().horses[0]!
    const name = wrapper.findAll('[data-testid="short-name"]')[0]!
    await wrapper.findAll('.tooltip-trigger')[0]!.trigger('pointerenter')
    expect(document.querySelector('[data-testid="tooltip"]')?.textContent?.trim()).toBe(horse.name)
    wrapper.unmount()
    expect(name.get('.short-name__visible').text()).toMatch(/^\S+ [A-ZÇĞİÖŞÜ]\.$/)
    expect(name.get('.visually-hidden').text()).toBe(`(${horse.name})`)
  })

  it('[X9] translates colour names', () => {
    const { wrapper } = mountFeature(HorseList, { locale: 'tr' })
    const colors = wrapper.findAll('.swatch__label').map((label) => label.text())
    expect(colors).toContain('Kırmızı')
    expect(wrapper.findAll('th').map((th) => th.text())).toContain('Kondisyon')
  })

  it('[X8] sorts by condition (best first) and back, exposing aria-sort', async () => {
    const { wrapper } = mountFeature(HorseList)
    const conditions = () =>
      bodyRows(wrapper).map((row) => Number(row.find('.condition__value').text()))
    const header = () => wrapper.findAll('th')[2]!

    expect(header().attributes('aria-sort')).toBe('none')
    expect(wrapper.findAll('th')[0]!.attributes('aria-sort')).toBe('ascending')

    await header().get('button').trigger('click')
    expect(header().attributes('aria-sort')).toBe('descending')
    expect(conditions()).toEqual([...conditions()].sort((a, b) => b - a))

    await header().get('button').trigger('click')
    expect(header().attributes('aria-sort')).toBe('ascending')
    expect(conditions()).toEqual([...conditions()].sort((a, b) => a - b))

    // Switching back to No starts ascending; a second click flips it.
    await wrapper.findAll('th')[0]!.get('button').trigger('click')
    expect(bodyRows(wrapper)[0]!.find('.number').text()).toBe('1')
    await wrapper.findAll('th')[0]!.get('button').trigger('click')
    expect(bodyRows(wrapper)[0]!.find('.number').text()).toBe('20')
  })

  it('[R4] shows the lane of every horse running in the current round', async () => {
    const { wrapper, race } = mountFeature(HorseList)
    expect(wrapper.findAll('[data-testid="lane-badge"]')).toHaveLength(0)

    race.generateProgram()
    await nextTick()
    const badges = wrapper.findAll('[data-testid="lane-badge"]')
    expect(badges).toHaveLength(10)
    const firstHorse = race.currentRound!.horseIds[0]!
    const row = bodyRows(wrapper).find((r) => r.find('.number').text() === String(firstHorse))!
    const badge = row.get('[data-testid="lane-badge"]')
    expect(badge.get('[aria-hidden="true"]').text()).toBe('L1')
    expect(badge.get('.visually-hidden').text()).toBe('Lane 1')
  })
})

describe('ConditionBar', () => {
  it('[C3] shows the value and scales the bar with transform only', () => {
    const wrapper = mount(ConditionBar, { props: { value: 100 } })
    expect(wrapper.text()).toBe('100')
    expect(wrapper.get('.condition__fill').attributes('style')).toContain('scaleX(1)')
    expect(wrapper.get('.condition__track').attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toContain('condition--high')
  })

  it('[C3] colours low, mid and high condition differently', () => {
    expect(mount(ConditionBar, { props: { value: 1 } }).classes()).toContain('condition--low')
    expect(mount(ConditionBar, { props: { value: 50 } }).classes()).toContain('condition--mid')
    expect(
      mount(ConditionBar, { props: { value: 1 } })
        .get('.condition__fill')
        .attributes('style'),
    ).toContain('scaleX(0)')
  })
})
