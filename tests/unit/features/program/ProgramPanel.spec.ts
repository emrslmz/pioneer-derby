import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ProgramPanel from '@/features/program/components/ProgramPanel.vue'
import { roundState } from '@/features/program/roundState'
import { mountFeature } from '../mount'

afterEach(() => vi.useRealTimers())

describe('roundState', () => {
  it('[R4] marks finished, live, next and upcoming rounds', () => {
    expect(roundState(0, 0, 'idle', 0)).toBe('upcoming')
    expect(roundState(0, 0, 'ready', 0)).toBe('next')
    expect(roundState(0, 0, 'running', 0)).toBe('live')
    expect(roundState(0, 0, 'paused', 0)).toBe('next')
    expect(roundState(0, 1, 'intermission', 1)).toBe('done')
    expect(roundState(1, 1, 'intermission', 1)).toBe('next')
    expect(roundState(4, 1, 'running', 1)).toBe('upcoming')
    expect(roundState(5, 5, 'finished', 6)).toBe('done')
  })
})

describe('ProgramPanel', () => {
  it('[R3] is empty until a program is generated', () => {
    const { wrapper } = mountFeature(ProgramPanel)
    expect(wrapper.text()).toContain('Press Generate Program')
    expect(wrapper.findAll('[data-testid="program-round"]')).toHaveLength(0)
  })

  it('[R3] [C4] [C5] [C6] shows 6 rounds of 10 lanes with correct lap labels', async () => {
    const { wrapper, race } = mountFeature(ProgramPanel)
    race.generateProgram()
    await nextTick()

    const rounds = wrapper.findAll('[data-testid="program-round"]')
    expect(rounds).toHaveLength(6)
    expect(rounds.map((r) => r.get('h3').text())).toEqual([
      '1st Lap – 1200 m',
      '2nd Lap – 1400 m',
      '3rd Lap – 1600 m',
      '4th Lap – 1800 m',
      '5th Lap – 2000 m',
      '6th Lap – 2200 m',
    ])
    for (const round of rounds) expect(round.findAll('tbody tr')).toHaveLength(10)
  })

  it('[R3] labels the program column "Lane", not "Position" (nothing has been raced yet)', async () => {
    const { wrapper, race } = mountFeature(ProgramPanel)
    race.generateProgram()
    await nextTick()
    const headers = wrapper.findAll('[data-testid="program-round"]')[0]!.findAll('th')
    expect(headers.map((th) => th.text())).toEqual(['Lane', 'Name'])
  })

  it('[R4] highlights the current round as it progresses', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { wrapper, race } = mountFeature(ProgramPanel)
    const states = () =>
      wrapper.findAll('[data-testid="program-round"]').map((r) => r.attributes('data-state'))

    race.generateProgram()
    await nextTick()
    expect(states()).toEqual(['next', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'])
    expect(wrapper.findAll('[aria-current="step"]')).toHaveLength(1)

    race.start()
    await nextTick()
    expect(states()[0]).toBe('live')

    vi.advanceTimersByTime(race.currentRace!.durationMs + 1)
    await nextTick()
    expect(states().slice(0, 2)).toEqual(['done', 'next'])
  })

  it('[X9] uses Turkish lap labels and column names', async () => {
    const { wrapper, race } = mountFeature(ProgramPanel, { locale: 'tr' })
    race.generateProgram()
    await nextTick()
    const first = wrapper.findAll('[data-testid="program-round"]')[0]!
    expect(first.get('h3').text()).toBe('1. Tur – 1200 m')
    expect(first.findAll('th').map((th) => th.text())).toEqual(['Kulvar', 'İsim'])
  })

  it('[R3] a new program shows a brief loading veil that never blocks interaction', async () => {
    const { wrapper, race } = mountFeature(ProgramPanel)
    expect(wrapper.find('[data-testid="program-loading"]').exists()).toBe(false)
    race.generateProgram()
    await nextTick()
    const veil = wrapper.get('[data-testid="program-loading"]')
    expect(veil.attributes('aria-hidden')).toBe('true')
    expect(veil.text()).toBe('Drawing the program…')
    expect(wrapper.findAll('[data-testid="program-round"]')).toHaveLength(6) // already there
  })
})
