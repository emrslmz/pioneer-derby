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
  it('[R5] while the first round runs it only shows the live block, no official result yet', async () => {
    const { wrapper, race } = startRace()
    vi.advanceTimersByTime(race.currentRace!.durationMs - 100)
    await nextTick()
    expect(wrapper.findAll('[data-testid="result-round"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Race in progress')
  })

  it('[R5] adds one result block per finished round, in order', async () => {
    const { wrapper, race } = startRace()
    const blocks = () => wrapper.findAll('[data-testid="result-round"]')

    await finishRound(race)
    expect(blocks()).toHaveLength(1)
    expect(blocks()[0]!.get('h3').text()).toBe('1st Lap – 1200 m')

    race.setAutoAdvance(true)
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

  describe('live finishing order', () => {
    const SPEED = 16

    function startFramedRace() {
      vi.useFakeTimers({
        toFake: [
          'setTimeout',
          'clearTimeout',
          'requestAnimationFrame',
          'cancelAnimationFrame',
          'performance',
          'Date',
        ],
      })
      const mounted = mountFeature(ResultsPanel)
      mounted.race.generateProgram()
      mounted.race.setSpeed(SPEED)
      mounted.race.start()
      return mounted
    }
    const rows = (wrapper: ReturnType<typeof startFramedRace>['wrapper']) =>
      wrapper.findAll('[data-testid="result-live"] tbody tr')

    it('[R5] horses appear one by one as they cross the line, before the round is official', async () => {
      const { wrapper, race } = startFramedRace()
      const placings = race.currentRace!.result.placings
      await nextTick()
      // From the start of the round: its block, with "Race in progress" and no rows yet.
      expect(wrapper.get('[data-testid="result-live"]').text()).toContain('Race in progress')
      expect(rows(wrapper)).toHaveLength(0)
      expect(wrapper.find('.result__dots').exists()).toBe(true)

      // Just after the winner crosses the line: one row, and still no official result.
      vi.advanceTimersByTime(Math.ceil(placings[0]!.timeMs / SPEED) + 20)
      await nextTick()
      expect(rows(wrapper)).toHaveLength(1)
      expect(rows(wrapper)[0]!.text()).toContain(
        useHorsesStore().getHorse(placings[0]!.horseId)!.name.split(' ')[0],
      )
      expect(wrapper.findAll('[data-testid="result-round"]')).toHaveLength(0)
      expect(wrapper.get('[data-testid="result-live"]').text()).toContain('Live')

      // Then the second, in order.
      vi.advanceTimersByTime(Math.ceil((placings[1]!.timeMs - placings[0]!.timeMs) / SPEED) + 20)
      await nextTick()
      expect(rows(wrapper)).toHaveLength(2)
      expect(rows(wrapper)[1]!.find('.position').text()).toContain('2')
    })

    it('[R5] when the last horse finishes the live block becomes the official result', async () => {
      const { wrapper, race } = startFramedRace()
      vi.advanceTimersByTime(Math.ceil(race.currentRace!.durationMs / SPEED) + 50)
      await nextTick()
      await nextTick()
      expect(wrapper.find('[data-testid="result-live"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-testid="result-round"]')).toHaveLength(1)
      expect(wrapper.findAll('[data-testid="result-round"] tbody tr')).toHaveLength(10)
    })

    it('[R4] pausing says so, and resuming carries on', async () => {
      const { wrapper, race } = startFramedRace()
      await nextTick()
      race.pause()
      await nextTick()
      expect(wrapper.get('[data-testid="result-live"]').text()).toContain('Race paused')
      race.resume()
      await nextTick()
      expect(wrapper.get('[data-testid="result-live"]').text()).toContain('Race in progress')
    })

    it('[R4] pausing freezes the live list where it is', async () => {
      const { wrapper, race } = startFramedRace()
      const placings = race.currentRace!.result.placings
      await nextTick() // the frame loop starts once the clock runs
      vi.advanceTimersByTime(Math.ceil(placings[2]!.timeMs / SPEED) + 20)
      await nextTick()
      const shown = rows(wrapper).length
      expect(shown).toBeGreaterThanOrEqual(3)
      race.pause()
      vi.advanceTimersByTime(60_000)
      await nextTick()
      expect(rows(wrapper)).toHaveLength(shown)
      expect(shown).toBeGreaterThanOrEqual(3)
    })
  })
})
