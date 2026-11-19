import type { HorseId, RaceSpeed } from '@/domain/types'

/**
 * Typed event catalogue (X5). Adding an event = adding a key here; every `track` call is checked
 * against it, so payloads can't drift from what dashboards expect.
 */
export interface AnalyticsEventMap {
  program_generated: { seed: number; roundCount: number; source: 'initial' | 'regenerate' }
  race_started: { seed: number }
  race_paused: { roundIndex: number; elapsedMs: number }
  race_resumed: { roundIndex: number; elapsedMs: number }
  round_finished: { roundIndex: number; distance: number; winnerId: HorseId; durationMs: number }
  race_finished: { seed: number; rounds: number }
  speed_changed: { from: RaceSpeed; to: RaceSpeed }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

export interface AnalyticsEvent<K extends AnalyticsEventName = AnalyticsEventName> {
  readonly name: K
  readonly payload: AnalyticsEventMap[K]
  /** ms since epoch */
  readonly timestamp: number
  /** Groups events of one visit, like a real analytics SDK would. */
  readonly sessionId: string
}
