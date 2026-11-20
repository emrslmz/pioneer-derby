import { CONDITION_MAX, CONDITION_MIN, RACE_TIMING, SPEED_MODEL } from './constants'
import { randomFloat, randomInt, type Rng } from './random'
import type { Horse, HorseId, Placing, Round, RoundRace, SpeedProfile, Surge } from './types'

/**
 * Deterministic race engine (ADR 0001).
 *
 * At round start every horse gets a `SpeedProfile`: a finish time from its condition plus seeded
 * noise, and a few "surges" that make the race look alive. Positions are a pure function of time,
 * so results are known before the animation starts and the UI only asks "where is horse X at t?".
 */

const TAU = Math.PI * 2

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Race time for a horse with speed factor 1: the distance at a real racing pace (~73 s for 1200 m). */
export function roundDurationMs(distance: number): number {
  return (distance / RACE_TIMING.metresPerSecond) * 1000
}

/** Expected speed from condition alone: CONDITION_MIN → minFactor, CONDITION_MAX → maxFactor. */
export function baseSpeedFactor(condition: number): number {
  const t = clamp((condition - CONDITION_MIN) / (CONDITION_MAX - CONDITION_MIN), 0, 1)
  return lerp(SPEED_MODEL.minFactor, SPEED_MODEL.maxFactor, t)
}

function createSurges(rng: Rng): Surge[] {
  return Array.from({ length: SPEED_MODEL.surgeCount }, () => ({
    amplitude: randomFloat(rng, 0, SPEED_MODEL.maxSurgeAmplitude),
    frequency: randomInt(rng, 1, SPEED_MODEL.maxSurgeFrequency),
    phase: randomFloat(rng, 0, TAU),
  }))
}

/** Builds one horse's profile for a round. Higher condition → faster on average (A5). */
export function createSpeedProfile(
  horse: Horse,
  lane: number,
  distance: number,
  rng: Rng,
): SpeedProfile {
  const noise = randomFloat(rng, -SPEED_MODEL.variance, SPEED_MODEL.variance)
  const speed = baseSpeedFactor(horse.condition) * (1 + noise)

  return {
    horseId: horse.id,
    lane,
    finishTimeMs: roundDurationMs(distance) / speed,
    surges: createSurges(rng),
  }
}

/**
 * Share of the distance covered at `elapsedMs`, in [0, 1].
 *
 * p(u) = u + Σ a·(sin(2πfu + φ) − sin φ) / 2πf, with u = elapsed / finishTime.
 * Whole-number frequencies make p(1) = 1, and Σ a < 1 keeps p′(u) > 0: horses never stop or
 * run backwards, and every horse crosses the line exactly at its finish time.
 */
export function progressAt(profile: SpeedProfile, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  if (elapsedMs >= profile.finishTimeMs) return 1

  const u = elapsedMs / profile.finishTimeMs
  const wobble = profile.surges.reduce(
    (sum, { amplitude, frequency, phase }) =>
      sum +
      (amplitude * (Math.sin(TAU * frequency * u + phase) - Math.sin(phase))) / (TAU * frequency),
    0,
  )
  return clamp(u + wobble, 0, 1)
}

/** Metres covered at `elapsedMs`. */
export function positionAt(profile: SpeedProfile, distance: number, elapsedMs: number): number {
  return progressAt(profile, elapsedMs) * distance
}

/** Placings by finish time; equal times fall back to lane order so results are always stable. */
export function finishingOrder(profiles: readonly SpeedProfile[]): Placing[] {
  return [...profiles]
    .sort((a, b) => a.finishTimeMs - b.finishTimeMs || a.lane - b.lane)
    .map((profile, index) => ({
      position: index + 1,
      horseId: profile.horseId,
      timeMs: profile.finishTimeMs,
    }))
}

/** Prepares a round: one profile per lane and the final result, all computed up front. */
export function createRoundRace(round: Round, horses: readonly Horse[], rng: Rng): RoundRace {
  const horsesById = new Map<HorseId, Horse>(horses.map((horse) => [horse.id, horse]))

  const profiles = round.horseIds.map((horseId, lane) => {
    const horse = horsesById.get(horseId)
    if (!horse) throw new Error(`createRoundRace: unknown horse ${horseId} in round ${round.index}`)
    return createSpeedProfile(horse, lane, round.distance, rng)
  })

  const placings = finishingOrder(profiles)

  return {
    round,
    profiles,
    durationMs: Math.max(0, ...profiles.map((profile) => profile.finishTimeMs)),
    result: { roundIndex: round.index, distance: round.distance, placings },
  }
}
