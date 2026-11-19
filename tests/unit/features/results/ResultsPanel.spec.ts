import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ResultsPanel from '@/features/results/components/ResultsPanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { mountFeature } from '../mount'

afterEach(() => vi.useRealTimers())

function startRace(locale: 'en' | 'tr' = 'en') {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
  const mounted = mountFeature(ResultsPanel, { locale })
  mounted.race.generateProgram()
  mounted.race.start()
  return mounted
}

const finishRound = async (race: ReturnType<typeof startRace>['race']) => {
  vi.advanceTimersByTime(Math.ceil(race.currentRace!.durationMs - race.elapsedMs()) + 1)
  await nextTick()
}

describe('ResultsPanel', () => {
  it('[R5] stays empty while the first round is still running', async () => {
    const { wrapper, race } = startRace()
    vi.advanceTimersByTime(race.currentRace!.durationMs - 100)
    await nextTick()
    expect(wrapper.findAll('[data-testid="result-round"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Results appear here')
  })

  it('[R5] adds one result block per finished round, in order', async () => {
    const { wrapper, race } = startRace()
    const blocks = () => wrapper.findAll('[data-testid="result-round"]')

    await finishRound(race)
    expect(blocks()).toHaveLength(1)
    expect(blocks()[0]!.get('h3').text()).toBe('1st Lap – 1200 m')

    vi.runAllTimers()
    await nextTick()
    expect(blocks().map((b) => b.get('h3').text())).toEqual([
      '1st Lap – 1200 m',
      '2nd Lap – 1400 m',
      '3rd Lap – 1600 m',
      '4th Lap – 1800 m',
      '5th Lap – 2000 m',
      '6th Lap – 2200 m',
    ])
  })

  it('[R5] shows position, name and time for all 10 runners, with podium medals', async () => {
    const { wrapper, race } = startRace()
    await finishRound(race)

    const block = wrapper.get('[data-testid="result-round"]')
    expect(block.findAll('th').map((th) => th.text())).toEqual(['Position', 'Name', 'Time'])
    const rows = block.findAll('tbody tr')
    expect(rows).toHaveLength(10)

    const result = race.completedResults[0]!
    const winner = useHorsesStore().getHorse(result.placings[0]!.horseId)!
    expect(rows[0]!.text()).toContain(winner.name)
    expect(rows[0]!.text()).toMatch(/\d+\.\d{2}s/)
    expect(rows[0]!.find('.position--1').text()).toContain('Gold')
    expect(rows[2]!.find('.position--3').exists()).toBe(true)
    expect(rows[3]!.find('.position--medal').exists()).toBe(false)
  })

  it('[X8] announces each winner through a polite live region', async () => {
    const { wrapper, race } = startRace()
    const announcer = wrapper.get('[data-testid="results-announcer"]')
    expect(announcer.attributes('aria-live')).toBe('polite')
    expect(announcer.text()).toBe('')

    await finishRound(race)
    const winner = useHorsesStore().getHorse(race.completedResults[0]!.placings[0]!.horseId)!
    expect(announcer.text()).toBe(`1st Lap – 1200 m result: ${winner.name} wins.`)
  })

  it('[X9] Turkish headings, columns and times', async () => {
    const { wrapper, race } = startRace('tr')
    await finishRound(race)
    const block = wrapper.get('[data-testid="result-round"]')
    expect(block.get('h3').text()).toBe('1. Tur – 1200 m')
    expect(block.findAll('th').map((th) => th.text())).toEqual(['Sıra', 'İsim', 'Süre'])
    expect(block.text()).toMatch(/\d+,\d{2}sn/)
  })
})
