import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { RACE_TRANSITIONS, transition, type RaceEvent } from '@/domain/race-machine'
import type { RaceStatus } from '@/domain/types'

const events: RaceEvent[] = [
  'GENERATE',
  'START',
  'PAUSE',
  'RESUME',
  'ROUND_FINISHED',
  'NEXT_ROUND',
  'PROGRAM_FINISHED',
]
const statuses = Object.keys(RACE_TRANSITIONS) as RaceStatus[]

describe('race status machine (properties)', () => {
  it('[X2] any event sequence keeps the machine in a known status', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...events), { maxLength: 60 }), (sequence) => {
        let status: RaceStatus = 'idle'
        for (const event of sequence) status = transition(status, event) ?? status
        expect(statuses).toContain(status)
      }),
    )
  })

  it('[X2] once a program exists the machine never falls back to idle', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...events), { maxLength: 60 }), (sequence) => {
        let status: RaceStatus = 'ready'
        for (const event of sequence) {
          status = transition(status, event) ?? status
          expect(status).not.toBe('idle')
        }
      }),
    )
  })
})
