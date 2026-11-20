import { computed, type ComputedRef, type Ref } from 'vue'
import { HORSES_PER_ROUND, ROUND_DISTANCES } from '@/domain/constants'
import type { Round } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useElementSize } from '@/shared/composables/useElementSize'
import { TRACK_CAMERA, trueScale, visibleMetres, type CameraMode } from '../camera'

const RAIL_PX = 10
const END_PAD_PX = 28

export interface TrackGeometry {
  marks: (typeof TRACK_CAMERA.marks)[CameraMode]
  metres: number
  visible: number
  pxPerMetre: number
  startPad: number
  finishX: number
  worldWidth: number
}

export interface Tick {
  m: number
  x: number
  pole: boolean
  label: string
}

/**
 * The track in pixels: how many metres fit on screen (true scale while following), where the
 * start and the finish are, the distance ticks, and the styles of the world and the looping turf.
 * Recomputed only on a resize or a new round, never per frame.
 */
export function useTrackGeometry(
  round: Readonly<Ref<Round | null | undefined>>,
  cameraMode: Readonly<Ref<CameraMode>>,
  viewport: Readonly<Ref<HTMLElement | null>>,
) {
  const { distance } = useLocale()
  const { width: viewportWidth, height: viewportHeight } = useElementSize(viewport)

  const geometry: ComputedRef<TrackGeometry> = computed(() => {
    const metres = round.value?.distance ?? ROUND_DISTANCES[0]
    const width = viewportWidth.value || 800 // jsdom / first paint fallback
    const height = viewportHeight.value || 340
    const laneHeight = (height - 2 * RAIL_PX) / HORSES_PER_ROUND
    const runnerWidth = laneHeight * 0.9 * (72 / 46)
    const startPad = runnerWidth + 12
    const usable = Math.max(1, width - startPad - END_PAD_PX)
    // Follow = true scale: the horse drawing is as long as a real horse, in track metres.
    const visible = visibleMetres(metres, cameraMode.value, usable / trueScale(runnerWidth))
    const pxPerMetre = usable / visible
    return {
      marks: TRACK_CAMERA.marks[cameraMode.value],
      metres,
      visible,
      pxPerMetre,
      startPad,
      finishX: startPad + metres * pxPerMetre,
      worldWidth: startPad + metres * pxPerMetre + END_PAD_PX,
    }
  })

  /** Distance ticks, and labelled red-and-white poles (spacing depends on the camera). */
  const ticks = computed(() => {
    const { metres, startPad, pxPerMetre, marks } = geometry.value
    const list: Tick[] = []
    for (let m = marks.tickMetres; m < metres; m += marks.tickMetres) {
      list.push({
        m,
        x: startPad + m * pxPerMetre,
        pole: m % marks.poleMetres === 0,
        label: distance(m),
      })
    }
    return list
  })

  const worldStyle = computed(() => ({
    width: `${geometry.value.worldWidth}px`,
    '--start-pad': `${geometry.value.startPad}px`,
    '--finish-x': `${geometry.value.finishX}px`,
  }))

  /** One turf pattern repeat (a light and a dark stripe), in px: the turf layer loops by it. */
  const turfPeriod = computed(
    () => 2 * geometry.value.marks.stripeMetres * geometry.value.pxPerMetre,
  )
  const turfStyle = computed(() => {
    const period = turfPeriod.value
    return {
      width: `calc(100% + ${period}px)`,
      '--stripe': `${period / 2}px`,
      // The grain tile is a whole number of periods wide, so the loop has no seam.
      '--grain': `${period * Math.max(1, Math.round(180 / period))}px`,
    }
  })

  return { geometry, ticks, worldStyle, turfPeriod, turfStyle }
}
