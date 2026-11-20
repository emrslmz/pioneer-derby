import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { cameraStart, TRACK_CAMERA, visibleMetres } from '@/features/track/camera'

describe('track camera', () => {
  it('[R6] follows with a 300 m window, or shows the whole track in overview', () => {
    expect(visibleMetres(1200, 'follow')).toBe(300)
    expect(visibleMetres(1200, 'overview')).toBe(1200)
    expect(visibleMetres(200, 'follow')).toBe(200)
  })

  it('[R6] keeps the leader at 70 % of the screen once the race is under way', () => {
    // Leader at 600 m: window starts at 600 − 0.7 × 300 = 390 m.
    expect(cameraStart(600, 1200, 300)).toBeCloseTo(390)
  })

  it('[R6] shows the start before the leader reaches 210 m, and the finish at the end', () => {
    expect(cameraStart(0, 1200, 300)).toBe(0)
    expect(cameraStart(150, 1200, 300)).toBe(0)
    expect(cameraStart(1200, 1200, 300)).toBe(900)
  })

  it('[X2] for any leader position the window stays on the track and the leader stays in view', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 300, max: 2400 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (distance, progress) => {
          const visible = visibleMetres(distance, 'follow')
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

  it('[R6] tunes stripes, ticks and poles in metres', () => {
    expect(TRACK_CAMERA.poleMetres % TRACK_CAMERA.tickMetres).toBe(0)
  })
})
