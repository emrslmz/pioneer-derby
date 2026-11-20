import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import FormChart from '@/features/horses/components/FormChart.vue'
import HorseList from '@/features/horses/components/HorseList.vue'
import { analyticsLog } from '@/shared/analytics'
import { useHorsesStore } from '@/stores/horses.store'
import { mountFeature } from '../mount'

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

describe('HorseStatsDrawer', () => {
  it('[X12] opens from a horse name with empty stats before any racing', async () => {
    const { wrapper } = mountFeature(HorseList, { attachTo: document.body })
    const horse = useHorsesStore().horses[0]!
    const button = wrapper.findAll('[data-testid="horse-name"]')[0]!
    expect(button.text()).toContain(`(${horse.name}), show statistics`)

    await button.trigger('click')
    await nextTick()
    const stats = wrapper.get('[data-testid="horse-stats"]')
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.get('dialog h2').text()).toBe(horse.name)
    expect(stats.get('[data-testid="stat-roundsRun"]').text()).toBe('0')
    expect(stats.get('[data-testid="stat-average"]').text()).toBe('—')
    expect(stats.text()).toContain('No rounds finished yet.')
    expect(analyticsLog.events.at(-1)).toMatchObject({
      name: 'horse_stats_opened',
      payload: { horseId: horse.id },
    })
  })

  it('[X12] shows rounds run, wins, podiums, average and form after racing', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { wrapper, race } = mountFeature(HorseList, { attachTo: document.body })
    race.generateProgram()
    race.start()
    race.setAutoAdvance(true)
    vi.runAllTimers()
    await nextTick()

    // The most frequent runner across the program.
    const counts = new Map<number, number>()
    for (const result of race.completedResults)
      for (const p of result.placings) counts.set(p.horseId, (counts.get(p.horseId) ?? 0) + 1)
    const [busiest, runs] = [...counts].sort((a, b) => b[1] - a[1])[0]!
    const positions = race.completedResults.flatMap((r) =>
      r.placings.filter((p) => p.horseId === busiest).map((p) => p.position),
    )

    const row = wrapper
      .findAll('[data-testid="horse-name"]')
      .find((b) => b.text().includes(useHorsesStore().getHorse(busiest)!.name))!
    await row.trigger('click')
    await nextTick()

    const stats = wrapper.get('[data-testid="horse-stats"]')
    expect(stats.get('[data-testid="stat-roundsRun"]').text()).toBe(String(runs))
    expect(stats.get('[data-testid="stat-wins"]').text()).toBe(
      String(positions.filter((p) => p === 1).length),
    )
    expect(stats.get('[data-testid="form-string"]').text()).toBe(positions.join('-'))
    expect(stats.findAll('[data-testid="form-point"]')).toHaveLength(runs)
  })
})

describe('FormChart', () => {
  it('[X12] plots one point per round run, best position at the top, with hover titles', () => {
    const wrapper = mount(FormChart, {
      props: {
        caption: 'Finishing position per round run',
        points: [
          { roundIndex: 0, position: 1, title: '1st Lap: 1st' },
          { roundIndex: 3, position: 10, title: '4th Lap: 10th' },
        ],
      },
    })
    const points = wrapper.findAll('circle')
    expect(points).toHaveLength(2)
    expect(Number(points[0]!.attributes('cy'))).toBeLessThan(Number(points[1]!.attributes('cy')))
    expect(points[1]!.get('title').text()).toBe('4th Lap: 10th')
    expect(wrapper.get('svg').attributes('role')).toBe('img')
    expect(wrapper.get('.form-chart__line').attributes('d')).toMatch(/^M[\d.]+ [\d.]+ L/)
    expect(wrapper.get('.form-chart__label').text()).toBe('10')
  })
})
