import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { summarizeProgram } from '@/domain/summary'
import ProgramSummaryDialog from '@/features/summary/components/ProgramSummaryDialog.vue'
import { analyticsLog } from '@/shared/analytics'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'
import { mountFeature } from '../mount'

afterEach(() => {
  vi.useRealTimers()
  analyticsLog.clear()
})

/** A whole program, run to the end on the fake clock, with an optional pick for round 1. */
function finishedProgram(options: { pick?: boolean } = {}) {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  const mounted = mountFeature(ProgramSummaryDialog, {
    props: { open: false, source: 'manual' as const },
    attachTo: document.body,
  })
  mounted.race.generateProgram()
  if (options.pick) {
    const prediction = usePredictionStore()
    prediction.pick(mounted.race.currentRound!.horseIds[0]!)
  }
  mounted.race.start()
  mounted.race.setAutoAdvance(true)
  vi.runAllTimers()
  return mounted
}

describe('ProgramSummaryDialog', () => {
  it('[X13] shows the champion, a chart of the best horses and the winner of each round', async () => {
    const { wrapper, race } = finishedProgram()
    await wrapper.setProps({ open: true })
    await nextTick()
    expect(race.status).toBe('finished')

    const horses = useHorsesStore()
    const summary = summarizeProgram(
      horses.horses.map((horse) => horse.id),
      race.completedResults,
    )
    const champion = horses.getHorse(summary.champion!.horseId)!

    expect(wrapper.get('[data-testid="summary-champion"]').text()).toContain(champion.name)
    expect(wrapper.get('[data-testid="summary-champion"]').text()).toContain(
      `${summary.champion!.wins} wins · ${summary.champion!.podiums} podiums`,
    )
    expect(wrapper.findAll('[data-testid="summary-chart-row"]')).toHaveLength(
      summary.standings.length,
    )
    expect(wrapper.findAll('[data-testid="summary-rounds"] tbody tr')).toHaveLength(6)
    expect(wrapper.get('[data-testid="summary-rounds"]').text()).toContain('6th Lap – 2200 m')
    wrapper.unmount()
  })

  it('[X13] the chart is a real table with the numbers; the bars are only a picture', async () => {
    const { wrapper } = finishedProgram()
    await wrapper.setProps({ open: true })
    const chart = wrapper.get('[data-testid="summary-chart"]')
    expect(chart.element.tagName).toBe('TABLE')
    expect(chart.findAll('th[scope="col"]').map((th) => th.text())).toContain('Wins')
    for (const bars of chart.findAll('.chart__bars')) {
      expect(bars.attributes('aria-hidden')).toBe('true')
    }
    wrapper.unmount()
  })

  it('[X4] shows the prediction score out of the best possible, or says nothing was picked', async () => {
    const without = finishedProgram()
    await without.wrapper.setProps({ open: true })
    expect(without.wrapper.get('[data-testid="summary-score"]').text()).toContain(
      'You made no predictions this time.',
    )
    without.wrapper.unmount()

    const picked = finishedProgram({ pick: true })
    await picked.wrapper.setProps({ open: true })
    const score = picked.wrapper.get('[data-testid="summary-score"]').text()
    expect(score).toMatch(/\d+ pts \/ 18/) // three points a round for six rounds
    expect(score).toContain('of 1 winners called')
    picked.wrapper.unmount()
  })

  it('[X5] tracks that the summary was viewed, and how it was opened', async () => {
    const { wrapper } = finishedProgram()
    analyticsLog.clear()
    await wrapper.setProps({ open: true })
    await nextTick()
    const viewed = analyticsLog.events.filter((event) => event.name === 'summary_viewed')
    expect(viewed).toHaveLength(1)
    expect(viewed[0]!.payload).toMatchObject({ source: 'manual' })
    expect((viewed[0]!.payload as { championId: number | null }).championId).not.toBeNull()
    wrapper.unmount()
  })

  it('[X13] Replay asks the app to replay; Close closes it', async () => {
    const { wrapper } = finishedProgram()
    await wrapper.setProps({ open: true })
    await wrapper.get('[data-testid="summary-replay"]').trigger('click')
    expect(wrapper.emitted('replay')).toHaveLength(1)
    await wrapper.get('[data-testid="summary-close"]').trigger('click')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    wrapper.unmount()
  })
})
