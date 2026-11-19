import type { RaceStatus } from './types'

/**
 * The race status machine (docs/ARCHITECTURE.md §6) as data.
 *
 *   idle ─GENERATE→ ready ─START→ running ─PAUSE→ paused ─RESUME→ running
 *   running ─ROUND_FINISHED→ intermission ─NEXT_ROUND→ running
 *   running ─PROGRAM_FINISHED→ finished ─GENERATE→ ready
 *
 * Pausing during the intermission is allowed; resuming starts the next round right away.
 * Generate is refused while a round is running or about to start (A6).
 */
export type RaceEvent =
  'GENERATE' | 'START' | 'PAUSE' | 'RESUME' | 'ROUND_FINISHED' | 'NEXT_ROUND' | 'PROGRAM_FINISHED'

export const RACE_TRANSITIONS: Readonly<
  Record<RaceStatus, Readonly<Partial<Record<RaceEvent, RaceStatus>>>>
> = {
  idle: { GENERATE: 'ready' },
  ready: { GENERATE: 'ready', START: 'running' },
  running: { PAUSE: 'paused', ROUND_FINISHED: 'intermission', PROGRAM_FINISHED: 'finished' },
  paused: { RESUME: 'running', GENERATE: 'ready' },
  intermission: { PAUSE: 'paused', NEXT_ROUND: 'running' },
  finished: { GENERATE: 'ready' },
}

/** Next status, or `null` when the event is not allowed in this status. */
export function transition(status: RaceStatus, event: RaceEvent): RaceStatus | null {
  return RACE_TRANSITIONS[status][event] ?? null
}

export function can(status: RaceStatus, event: RaceEvent): boolean {
  return transition(status, event) !== null
}
