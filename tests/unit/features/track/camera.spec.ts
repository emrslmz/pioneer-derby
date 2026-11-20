import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cameraStart, TRACK_CAMERA, trueScale, visibleMetres } from '@/features/track/camera'

describe('track camera', () => {
  it('[R6] follow is true scale: a 70 px horse drawing is 2.5 m, so 28 px per metre', () => {
    expect(trueScale(70)).toBe(28)
    // A 560 px wide track then shows 20 m of a 1200 m race.
    expect(visibleMetres(1200, 'follow', 560 / trueScale(70))).toBe(20)
  })

  it('[R6] overview shows the whole track; follow never shows more than the race', () => {
    expect(visibleMetres(1200, 'overview', 20)).toBe(1200)
    expect(visibleMetres(15, 'follow', 20)).toBe(15)
  })

  it('[R6] keeps the leader at 80 % of the screen once the race is under way', () => {
    // Leader at 600 m: window starts at 600 − 0.8 × 300 = 360 m.
    expect(cameraStart(600, 1200, 300)).toBeCloseTo(360)
  })

  it('[R6] shows the start before the leader reaches 240 m, and the finish at the end', () => {
    expect(cameraStart(0, 1200, 300)).toBe(0)
    expect(cameraStart(200, 1200, 300)).toBe(0)
    expect(cameraStart(1200, 1200, 300)).toBe(900)
  })

  it('[X2] for any leader position the window stays on the track and the leader stays in view', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 300, max: 2400 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (distance, progress) => {
          const visible = visibleMetres(distance, 'follow', 300)
          const leader = progress * distance
          const start = cameraStart(leader, distance, visible)
          expect(start).toBeGreaterThanOrEqual(0)
          expect(start + visible).toBeLessThanOrEqual(distance + 1e-9)
          expect(leader).toBeGreaterThanOrEqual(start - 1e-9)
          expect(leader).toBeLessThanOrEqual(start + visible + 1e-9)
        },
      ),
    )
  })

  it('[R6] tunes stripes, ticks and poles in metres for each camera', () => {
    for (const marks of Object.values(TRACK_CAMERA.marks)) {
      expect(marks.poleMetres % marks.tickMetres).toBe(0)
    }
  })
})
