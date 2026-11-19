import { SEED_STREAMS } from './constants'
import { createHorses } from './horses'
import { createRoundRace } from './race-engine'
import { createRng, deriveSeed } from './random'
import { createSchedule } from './schedule'
import type { Horse, Round, RoundRace } from './types'

/**
 * One game seed → the whole game (A11, X11).
 * Each concern draws from its own derived stream, so any part can be rebuilt on its own.
 */

export function horsesForSeed(seed: number): Horse[] {
  return createHorses(createRng(deriveSeed(seed, SEED_STREAMS.horses)))
}

export function scheduleForSeed(horses: readonly Horse[], seed: number): Round[] {
  return createSchedule(horses, createRng(deriveSeed(seed, SEED_STREAMS.schedule)))
}

export function roundRaceForSeed(round: Round, horses: readonly Horse[], seed: number): RoundRace {
  return createRoundRace(
    round,
    horses,
    createRng(deriveSeed(seed, SEED_STREAMS.round, round.index)),
  )
}
