import type { HORSE_COLORS } from './constants'

/** Horses are numbered 1..HORSE_COUNT, matching the "Horse List (1-20)" in the brief. */
export type HorseId = number

export type HorseColor = (typeof HORSE_COLORS)[number]
export type HorseColorKey = HorseColor['key']

export interface Horse {
  readonly id: HorseId
  readonly name: string
  readonly color: HorseColor
  /** CONDITION_MIN..CONDITION_MAX */
  readonly condition: number
}

export interface Round {
  /** 0-based; the UI shows `index + 1` as "1st Lap". */
  readonly index: number
  /** Metres. */
  readonly distance: number
  /** HORSES_PER_ROUND distinct ids, in lane order (lane 1 first). */
  readonly horseIds: readonly HorseId[]
}

/** A sine "surge" added to a horse's progress curve: speeds up and slows down mid-race. */
export interface Surge {
  readonly amplitude: number
  /** Whole number of cycles over the race, so the curve still ends exactly at the finish. */
  readonly frequency: number
  readonly phase: number
}

/** Everything needed to know where a horse is at any moment of a round. */
export interface SpeedProfile {
  readonly horseId: HorseId
  /** 0-based lane. */
  readonly lane: number
  /** Race time at which the horse crosses the finish line. */
  readonly finishTimeMs: number
  readonly surges: readonly Surge[]
}

export interface Placing {
  /** 1-based. */
  readonly position: number
  readonly horseId: HorseId
  readonly timeMs: number
}

export interface RoundResult {
  readonly roundIndex: number
  readonly distance: number
  /** Ordered by position. */
  readonly placings: readonly Placing[]
}

/** A round ready to animate: per-horse profiles plus the result, computed up front. */
export interface RoundRace {
  readonly round: Round
  readonly profiles: readonly SpeedProfile[]
  /** Race time when the last horse finishes. */
  readonly durationMs: number
  readonly result: RoundResult
}

export type RaceStatus = 'idle' | 'ready' | 'running' | 'paused' | 'intermission' | 'finished'
