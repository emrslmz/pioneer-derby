/**
 * Broadcast camera for the track: a window of `visibleMetres` that follows the leader, keeping
 * them at `leaderAt` of the screen width. Pure, so it is unit-tested without rendering.
 */
export const TRACK_CAMERA = {
  /** Metres of track on screen while following. */
  visibleMetres: 300,
  /** Where the leader sits on screen (0 = left edge, 1 = right edge). */
  leaderAt: 0.7,
  /** Turf mowing stripes, in metres. */
  stripeMetres: 25,
  /** Minor distance ticks every 100 m, labelled poles every 200 m. */
  tickMetres: 100,
  poleMetres: 200,
} as const

export type CameraMode = 'follow' | 'overview'

/** Metres of track visible on screen. Overview (or a short race) shows the whole distance. */
export function visibleMetres(distance: number, mode: CameraMode): number {
  return mode === 'follow' ? Math.min(TRACK_CAMERA.visibleMetres, distance) : distance
}

/** Left edge of the camera window, in metres from the start: 0 … distance − visible. */
export function cameraStart(leaderMetres: number, distance: number, visible: number): number {
  const ideal = leaderMetres - TRACK_CAMERA.leaderAt * visible
  return Math.min(Math.max(0, ideal), Math.max(0, distance - visible))
}
