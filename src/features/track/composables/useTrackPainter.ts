import { inject, provide, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { SpeedProfile } from '@/domain/types'
import { cameraStart, TRACK_CAMERA, type CameraMode } from '../camera'
import type { TrackGeometry } from './useTrackGeometry'

/**
 * Per-frame painting: transforms and text written straight to the DOM, never through Vue or
 * Pinia (X10, ADR 0008). The components of the track register the elements to paint; the race
 * loop calls `paint` for every horse and `frame` once per frame.
 */
export interface TrackPainter {
  setCarrier(lane: number, element: unknown): void
  setBehindLabel(lane: number, element: unknown): void
  setMapDot(lane: number, element: unknown): void
  setWorld(element: unknown): void
  setTurf(element: unknown): void
  setMapWindow(element: unknown): void
  setToGo(element: unknown): void
}

const PAINTER_KEY: InjectionKey<TrackPainter> = Symbol('track-painter')

export function injectTrackPainter(): TrackPainter {
  const painter = inject(PAINTER_KEY)
  if (!painter) throw new Error('The track painter is provided by RaceTrack')
  return painter
}

interface PainterOptions {
  geometry: ComputedRef<TrackGeometry>
  cameraMode: Readonly<Ref<CameraMode>>
  turfPeriod: Readonly<Ref<number>>
  locale: Readonly<Ref<string>>
  /** "803 m" in the active language. */
  formatDistance: (metres: number) => string
  /** "803 m to go". */
  formatToGo: (distance: string) => string
}

const elementOrNull = (element: unknown) => (element instanceof HTMLElement ? element : null)

export function useTrackPainter({
  geometry,
  cameraMode,
  turfPeriod,
  locale,
  formatDistance,
  formatToGo,
}: PainterOptions) {
  const carriers = new Map<number, HTMLElement>()
  const mapDots = new Map<number, HTMLElement>()
  const behindLabels = new Map<number, HTMLElement>()
  /** Each horse's distance this frame, in metres (scratch data for the frame, not state). */
  const runMetres = new Map<number, number>()
  let world: HTMLElement | null = null
  let turf: HTMLElement | null = null
  let mapWindow: HTMLElement | null = null
  let toGo: HTMLElement | null = null
  let leaderProgress = 0

  function register(registry: Map<number, HTMLElement>, lane: number, element: unknown) {
    const target = elementOrNull(element)
    if (target) registry.set(lane, target)
    else registry.delete(lane)
  }

  const painter: TrackPainter = {
    setCarrier: (lane, element) => register(carriers, lane, element),
    setBehindLabel: (lane, element) => register(behindLabels, lane, element),
    setMapDot: (lane, element) => register(mapDots, lane, element),
    setWorld: (element) => (world = elementOrNull(element)),
    setTurf: (element) => (turf = elementOrNull(element)),
    setMapWindow: (element) => (mapWindow = elementOrNull(element)),
    setToGo: (element) => (toGo = elementOrNull(element)),
  }
  provide(PAINTER_KEY, painter)

  /** Writes text only when it changes, so a steady frame touches nothing. */
  function setText(element: HTMLElement, text: string) {
    if (element.textContent !== text) element.textContent = text
  }

  /** Last whole-metre value written per label: text is only formatted when it changes. */
  const shownMetres = new Map<HTMLElement, number>()
  watch(locale, () => shownMetres.clear())
  function setMetres(element: HTMLElement, metres: number, format: (text: string) => string) {
    if (shownMetres.get(element) === metres) return
    shownMetres.set(element, metres)
    setText(element, format(formatDistance(metres)))
  }

  /** Horses left behind the true-scale camera get a "−23 m" gap at the left edge of their lane. */
  function paintBehindLabels(leaderMetres: number, start: number) {
    const follow = cameraMode.value === 'follow'
    for (const [lane, label] of behindLabels) {
      const run = runMetres.get(lane)
      const gap = run === undefined ? 0 : Math.round(leaderMetres - run)
      // Only a real gap: at the gate (and in a photo finish) nobody is "−0 m".
      const behind = follow && gap >= 1 && run! < start + TRACK_CAMERA.horseMetres
      if (behind) setMetres(label, gap, (text) => `−${text}`)
      if (label.hidden === behind) label.hidden = !behind
    }
  }

  /** One horse: its place in the world, the map dot, and whether it has finished. */
  function paint(profile: SpeedProfile, progress: number) {
    const { startPad, metres, pxPerMetre } = geometry.value
    const nose = startPad + progress * metres * pxPerMetre
    const carrier = carriers.get(profile.lane)
    if (carrier) {
      carrier.style.transform = `translate3d(calc(${nose.toFixed(2)}px - 100%), 0, 0)`
      // A horse that has crossed the line stops: no more gallop.
      carrier.classList.toggle('carrier--finished', progress >= 1)
    }
    const dot = mapDots.get(profile.lane)
    if (dot) dot.style.transform = `translate3d(${(progress * 100).toFixed(3)}%, 0, 0)`
    runMetres.set(profile.lane, progress * metres)
    if (progress > leaderProgress) leaderProgress = progress
  }

  /** Once per frame, after every horse: the camera, the turf, the map window, the labels. */
  function frame() {
    const { metres, visible, pxPerMetre } = geometry.value
    const leaderMetres = leaderProgress * metres
    const start = cameraStart(leaderMetres, metres, visible)
    leaderProgress = 0
    paintBehindLabels(leaderMetres, start)
    if (toGo) {
      setMetres(toGo, Math.ceil(Math.max(0, metres - leaderMetres)), formatToGo)
    }
    if (world) world.style.transform = `translate3d(${(-start * pxPerMetre).toFixed(2)}px, 0, 0)`
    if (turf) {
      const offset = -((start * pxPerMetre) % turfPeriod.value)
      turf.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`
    }
    if (mapWindow) {
      mapWindow.style.transform = `translate3d(${((start / visible) * 100).toFixed(3)}%, 0, 0)`
    }
  }

  return { paint, frame }
}
