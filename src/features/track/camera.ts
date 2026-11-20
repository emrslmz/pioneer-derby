/**
 * Broadcast camera for the track. "Follow" is true scale: a horse on screen is as long as a real
 * horse (`horseMetres`) relative to the track, so the window shows only the metres around the
 * leader and keeps them at `leaderAt` of the width. "Overview" fits the whole distance instead.
 * Pure, so it is unit-tested without rendering.
 */
export const TRACK_CAMERA = {
  /** Nose-to-tail length of the horse drawing, in metres (a thoroughbred is ~2.4 m). */
  horseMetres: 2.5,
  /** Where the leader sits on screen (0 = left edge, 1 = right edge): most of the view is the chase. */
  leaderAt: 0.8,
  /** Turf stripes, distance ticks and labelled poles, in metres, per camera mode. */
  marks: {
    follow: { stripeMetres: 5, tickMetres: 10, poleMetres: 50 },
    overview: { stripeMetres: 50, tickMetres: 100, poleMetres: 200 },
  },
} as const

export type CameraMode = 'follow' | 'overview'

/** Pixels per metre at true scale: the horse drawing is `horseMetres` long. */
export function trueScale(runnerWidthPx: number): number {
  return runnerWidthPx / TRACK_CAMERA.horseMetres
}

/**
 * Metres of track on screen. Follow shows what fits at true scale (never more than the race);
 * overview shows the whole distance.
 */
export function visibleMetres(distance: number, mode: CameraMode, trueScaleMetres: number): number {
  return mode === 'follow' ? Math.min(trueScaleMetres, distance) : distance
}

/** Left edge of the camera window, in metres from the start: 0 … distance − visible. */
export function cameraStart(leaderMetres: number, distance: number, visible: number): number {
  const ideal = leaderMetres - TRACK_CAMERA.leaderAt * visible
  return Math.min(Math.max(0, ideal), Math.max(0, distance - visible))
}
