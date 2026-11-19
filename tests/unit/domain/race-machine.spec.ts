import { describe, expect, it } from 'vitest'
import { can, RACE_TRANSITIONS, transition } from '@/domain/race-machine'

describe('race status machine', () => {
  it('[R4] runs ready → running → intermission → running → finished', () => {
    expect(transition('idle', 'GENERATE')).toBe('ready')
    expect(transition('ready', 'START')).toBe('running')
    expect(transition('running', 'ROUND_FINISHED')).toBe('intermission')
    expect(transition('intermission', 'NEXT_ROUND')).toBe('running')
    expect(transition('running', 'PROGRAM_FINISHED')).toBe('finished')
  })

  it('[R4] can pause and resume a running round or an intermission', () => {
    expect(transition('running', 'PAUSE')).toBe('paused')
    expect(transition('intermission', 'PAUSE')).toBe('paused')
    expect(transition('paused', 'RESUME')).toBe('running')
  })

  it('[R3] Generate is refused while a round is running or about to start (A6)', () => {
    expect(can('running', 'GENERATE')).toBe(false)
    expect(can('intermission', 'GENERATE')).toBe(false)
    for (const status of ['idle', 'ready', 'paused', 'finished'] as const) {
      expect(can(status, 'GENERATE')).toBe(true)
    }
  })

  it('[R4] Start is only possible once a program exists', () => {
    expect(can('idle', 'START')).toBe(false)
    expect(can('finished', 'START')).toBe(false)
  })

  it('[R4] every status is reachable from idle', () => {
    const reached = new Set<string>(['idle'])
    let frontier = ['idle'] as (keyof typeof RACE_TRANSITIONS)[]
    while (frontier.length > 0) {
      frontier = frontier
        .flatMap((status) => Object.values(RACE_TRANSITIONS[status]))
        .filter((next) => !reached.has(next))
      for (const status of frontier) reached.add(status)
    }
    expect([...reached].sort()).toEqual(Object.keys(RACE_TRANSITIONS).sort())
  })
})
