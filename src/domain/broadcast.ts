import { COMMENTARY, PHOTO_FINISH_MS } from './constants'
import { progressAt } from './race-engine'
import type { HorseId, RoundRace, SpeedProfile } from './types'

/**
 * X13 — the broadcast layer's facts, derived purely from a precomputed round:
 * live standings at any moment and a commentary timeline. The UI translates the codes.
 */

/** Order of the field at `elapsedMs`: furthest first; finished horses by finish time; then lane. */
export function standingsAt(profiles: readonly SpeedProfile[], elapsedMs: number): HorseId[] {
  return profiles
    .map((profile) => ({ profile, progress: progressAt(profile, elapsedMs) }))
    .sort(
      (a, b) =>
        b.progress - a.progress ||
        a.profile.finishTimeMs - b.profile.finishTimeMs ||
        a.profile.lane - b.profile.lane,
    )
    .map(({ profile }) => profile.horseId)
}

/** True when 1st and 2nd are separated by less than PHOTO_FINISH_MS of race time. */
export function isPhotoFinish(race: RoundRace): boolean {
  const [first, second] = race.result.placings
  return !!first && !!second && second.timeMs - first.timeMs < PHOTO_FINISH_MS
}

export type CommentaryCode =
  'START' | 'LEAD_CHANGE' | 'HALFWAY' | 'FINAL_STRETCH' | 'PHOTO_FINISH' | 'WINNER'

export interface CommentaryEvent {
  /** Race time at which the line is called. */
  readonly atMs: number
  readonly code: CommentaryCode
  /** The horse the line is about (leader / winner), if any. */
  readonly horseId: HorseId | null
}

/**
 * Scans the round once and returns what a commentator would say, in time order:
 * START → lead changes (rate-limited) → HALFWAY → FINAL_STRETCH → [PHOTO_FINISH] → WINNER.
 */
export function buildCommentary(race: RoundRace): CommentaryEvent[] {
  const winner = race.result.placings[0]
  if (!winner) return []

  const events: CommentaryEvent[] = [{ atMs: 0, code: 'START', horseId: null }]
  const leaderProfile = (t: number) => {
    const leaderId = standingsAt(race.profiles, t)[0] as HorseId
    return race.profiles.find((p) => p.horseId === leaderId) as SpeedProfile
  }

  let leader: HorseId | null = null
  let lastLeadCallAt = Number.NEGATIVE_INFINITY
  let halfwayCalled = false
  let stretchCalled = false

  // Stop just before the winner crosses the line; the finish has its own calls.
  for (let t = COMMENTARY.sampleMs; t < winner.timeMs; t += COMMENTARY.sampleMs) {
    const front = leaderProfile(t)
    const progress = progressAt(front, t)

    if (!halfwayCalled && progress >= COMMENTARY.halfway) {
      halfwayCalled = true
      events.push({ atMs: t, code: 'HALFWAY', horseId: front.horseId })
      leader = front.horseId
      lastLeadCallAt = t
      continue
    }
    if (!stretchCalled && progress >= COMMENTARY.finalStretch) {
      stretchCalled = true
      events.push({ atMs: t, code: 'FINAL_STRETCH', horseId: front.horseId })
      leader = front.horseId
      lastLeadCallAt = t
      continue
    }
    if (
      progress >= COMMENTARY.ignoreLeadChangesBelow &&
      front.horseId !== leader &&
      t - lastLeadCallAt >= COMMENTARY.minLeadChangeGapMs
    ) {
      // The first leader worth naming is also announced as taking the lead.
      events.push({ atMs: t, code: 'LEAD_CHANGE', horseId: front.horseId })
      leader = front.horseId
      lastLeadCallAt = t
    }
  }

  if (isPhotoFinish(race)) {
    // Called as they approach the line, so it is seen before the winner is named.
    const lastCall = events[events.length - 1]?.atMs ?? 0
    const atMs = Math.max(lastCall, winner.timeMs - COMMENTARY.photoFinishLeadMs)
    events.push({ atMs, code: 'PHOTO_FINISH', horseId: null })
  }
  events.push({ atMs: winner.timeMs, code: 'WINNER', horseId: winner.horseId })
  return events
}

/** Index of the latest event already called at `elapsedMs` (-1 before the start). */
export function commentaryIndexAt(events: readonly CommentaryEvent[], elapsedMs: number): number {
  let index = -1
  for (let i = 0; i < events.length && (events[i] as CommentaryEvent).atMs <= elapsedMs; i++) {
    index = i
  }
  return index
}
