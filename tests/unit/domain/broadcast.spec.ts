import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { buildCommentary, commentaryIndexAt, isPhotoFinish, standingsAt } from '@/domain/broadcast'
import { COMMENTARY, PHOTO_FINISH_MS } from '@/domain/constants'
import { horsesForSeed, roundRaceForSeed, scheduleForSeed } from '@/domain/game'
import type { RoundRace, SpeedProfile } from '@/domain/types'
import { seedArb } from './arbitraries'

const profile = (horseId: number, lane: number, finishTimeMs: number): SpeedProfile => ({
  horseId,
  lane,
  finishTimeMs,
  surges: [],
})

const raceFor = (seed: number, roundIndex = 0): RoundRace => {
  const horses = horsesForSeed(seed)
  return roundRaceForSeed(scheduleForSeed(horses, seed)[roundIndex]!, horses, seed)
}

describe('standingsAt', () => {
  const profiles = [profile(1, 0, 1000), profile(2, 1, 800), profile(3, 2, 800)]

  it('[X13] orders the field by distance covered', () => {
    expect(standingsAt(profiles, 400)).toEqual([2, 3, 1])
  })

  it('[X13] finished horses are ordered by finish time, then lane', () => {
    expect(standingsAt(profiles, 5000)).toEqual([2, 3, 1])
  })

  it('[X2] at the end the standings equal the official result, for any seed', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 5 }), (seed, roundIndex) => {
        const race = raceFor(seed, roundIndex)
        expect(standingsAt(race.profiles, race.durationMs)).toEqual(
          race.result.placings.map((p) => p.horseId),
        )
      }),
      { numRuns: 60 },
    )
  })
})

describe('isPhotoFinish', () => {
  const base = raceFor(1)
  const withGap = (gap: number): RoundRace => ({
    ...base,
    result: {
      roundIndex: 0,
      distance: 1200,
      placings: [
        { position: 1, horseId: 1, timeMs: 6000 },
        { position: 2, horseId: 2, timeMs: 6000 + gap },
      ],
    },
  })

  it(`[X13] a gap under ${PHOTO_FINISH_MS} ms is a photo finish`, () => {
    expect(isPhotoFinish(withGap(PHOTO_FINISH_MS - 1))).toBe(true)
    expect(isPhotoFinish(withGap(PHOTO_FINISH_MS))).toBe(false)
  })
})

describe('buildCommentary', () => {
  it('[X13] calls the start, halfway, final stretch and the winner in order', () => {
    const race = raceFor(42)
    const events = buildCommentary(race)
    const codes = events.map((e) => e.code)

    expect(events[0]).toEqual({ atMs: 0, code: 'START', horseId: null })
    expect(events.at(-1)).toEqual({
      atMs: race.result.placings[0]!.timeMs,
      code: 'WINNER',
      horseId: race.result.placings[0]!.horseId,
    })
    expect(codes.filter((c) => c === 'HALFWAY')).toHaveLength(1)
    expect(codes.filter((c) => c === 'FINAL_STRETCH')).toHaveLength(1)
    expect(codes.indexOf('HALFWAY')).toBeLessThan(codes.indexOf('FINAL_STRETCH'))
  })

  it('[X13] adds a photo-finish call just before the winner when it is close', () => {
    const race = raceFor(17)
    expect(isPhotoFinish(race)).toBe(true)
    expect(
      buildCommentary(race)
        .slice(-2)
        .map((e) => e.code),
    ).toEqual(['PHOTO_FINISH', 'WINNER'])
  })

  it('[X2] for any seed: time-ordered, one START first, WINNER last, lead calls rate-limited', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 5 }), (seed, roundIndex) => {
        const race = raceFor(seed, roundIndex)
        const events = buildCommentary(race)
        const times = events.map((e) => e.atMs)
        expect(times).toEqual([...times].sort((a, b) => a - b))
        expect(events[0]!.code).toBe('START')
        expect(events.filter((e) => e.code === 'START')).toHaveLength(1)
        expect(events.at(-1)!.code).toBe('WINNER')

        const leadCalls = events.filter((e) =>
          ['LEAD_CHANGE', 'HALFWAY', 'FINAL_STRETCH'].includes(e.code),
        )
        // Milestones may follow quickly; plain lead changes respect the gap.
        const leadChangeGaps = leadCalls
          .map((e, i) =>
            i > 0 && e.code === 'LEAD_CHANGE' ? e.atMs - leadCalls[i - 1]!.atMs : null,
          )
          .filter((gap) => gap !== null)
        expect(leadChangeGaps.every((gap) => gap >= COMMENTARY.minLeadChangeGapMs)).toBe(true)
        // Every call about a leader names a horse of this round.
        for (const e of leadCalls) expect(race.round.horseIds).toContain(e.horseId)
      }),
      { numRuns: 60 },
    )
  })

  it('[X13] returns nothing for a round without results', () => {
    const race = raceFor(1)
    expect(buildCommentary({ ...race, result: { ...race.result, placings: [] } })).toEqual([])
  })
})

describe('commentaryIndexAt', () => {
  it('[X13] finds the latest line already called', () => {
    const events = buildCommentary(raceFor(42))
    expect(commentaryIndexAt(events, -1)).toBe(-1)
    expect(commentaryIndexAt(events, 0)).toBe(0)
    expect(commentaryIndexAt(events, Number.POSITIVE_INFINITY)).toBe(events.length - 1)
  })
})
