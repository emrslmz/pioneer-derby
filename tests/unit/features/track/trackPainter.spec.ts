import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { computed, h, nextTick, ref } from 'vue'
import type { Round, SpeedProfile } from '@/domain/types'
import { TRACK_CAMERA } from '@/features/track/camera'
import { createAppI18n } from '@/i18n'
import { useTrackGeometry } from '@/features/track/composables/useTrackGeometry'
import { injectTrackPainter, useTrackPainter } from '@/features/track/composables/useTrackPainter'

const profile = (lane: number): SpeedProfile => ({
  horseId: lane + 1,
  lane,
  finishTimeMs: 1,
  surges: [],
})

/**
 * The painter provides itself to the components of the track; here a small child registers the
 * elements the real ones would (two lanes, the world, the turf, the map window, the distance label).
 */
function setup(mode: 'follow' | 'overview' = 'follow') {
  const cameraMode = ref(mode)
  const locale = ref('en')
  const geometry = computed(() => ({
    marks: TRACK_CAMERA.marks.follow,
    metres: 1200,
    visible: 20,
    pxPerMetre: 30,
    startPad: 40,
    finishX: 40 + 1200 * 30,
    worldWidth: 40 + 1200 * 30 + 28,
  }))
  let painter!: ReturnType<typeof useTrackPainter>
  // A functional component: it only injects the painter and registers elements.
  const Child = () => {
    const registry = injectTrackPainter()
    return [
      h('div', { ref: (el) => registry.setWorld(el), class: 'world' }),
      h('div', { ref: (el) => registry.setTurf(el), class: 'turf' }),
      h('span', { ref: (el) => registry.setMapWindow(el), class: 'window' }),
      h('span', { ref: (el) => registry.setToGo(el), class: 'to-go' }),
      ...[0, 1].flatMap((lane) => [
        h('div', { ref: (el) => registry.setCarrier(lane, el), class: `carrier-${lane}` }),
        h('span', {
          ref: (el) => registry.setBehindLabel(lane, el),
          class: `behind-${lane}`,
          hidden: true,
        }),
        h('span', { ref: (el) => registry.setMapDot(lane, el), class: `dot-${lane}` }),
      ]),
    ]
  }
  const wrapper = mount({
    setup() {
      painter = useTrackPainter({
        geometry,
        cameraMode,
        turfPeriod: ref(300),
        locale,
        formatDistance: (metres) => `${metres} m`,
        formatToGo: (left) => `${left} to go`,
      })
      return () => h(Child)
    },
  })
  const el = (selector: string) => wrapper.get(selector).element as HTMLElement
  return { painter, cameraMode, el, wrapper }
}

describe('track painter', () => {
  it('[X10] places a horse and its map dot by transform only', () => {
    const { painter, el } = setup()
    painter.paint(profile(0), 0.5)
    // startPad 40 + 0.5 × 1200 m × 30 px/m, the horse's nose; the carrier is shifted by its width.
    expect(el('.carrier-0').style.transform).toBe('translate3d(calc(18040.00px - 100%), 0, 0)')
    expect(el('.dot-0').style.transform).toBe('translate3d(50.000%, 0, 0)')
    expect(el('.carrier-0').getAttribute('style')).not.toMatch(/(^|;)\s*(left|width)\s*:/)
  })

  it('[R6] a horse that has crossed the line is marked finished, and only then', () => {
    const { painter, el } = setup()
    painter.paint(profile(0), 0.99)
    expect(el('.carrier-0').classList.contains('carrier--finished')).toBe(false)
    painter.paint(profile(0), 1)
    expect(el('.carrier-0').classList.contains('carrier--finished')).toBe(true)
  })

  it('[R6] each frame moves the camera, the looping turf, the map window and the distance to go', () => {
    const { painter, el } = setup()
    painter.paint(profile(0), 0.5) // leader at 600 m
    painter.frame()
    // The window starts 80 % of its width behind the leader: 600 − 0.8 × 20 = 584 m.
    expect(el('.world').style.transform).toBe('translate3d(-17520.00px, 0, 0)')
    // The turf moves by the remainder of one stripe period (300 px), never the whole distance.
    expect(el('.turf').style.transform).toBe('translate3d(-120.00px, 0, 0)')
    expect(el('.window').style.transform).toBe('translate3d(2920.000%, 0, 0)')
    expect(el('.to-go').textContent).toBe('600 m to go')
  })

  it('[R6] a horse out of the picture shows its gap to the leader, a bunched field shows none', () => {
    const { painter, el } = setup()
    painter.paint(profile(0), 0.5)
    painter.paint(profile(1), 0.45) // 60 m behind, outside the 20 m window
    painter.frame()
    expect(el('.behind-1').hidden).toBe(false)
    expect(el('.behind-1').textContent).toBe('−60 m')
    expect(el('.behind-0').hidden).toBe(true) // the leader

    // At the gate everyone is at 0 m: nobody is "−0 m".
    painter.paint(profile(0), 0)
    painter.paint(profile(1), 0)
    painter.frame()
    expect(el('.behind-1').hidden).toBe(true)
  })

  it('[R6] the whole-track camera shows no gaps: everyone is on screen', () => {
    const { painter, el } = setup('overview')
    painter.paint(profile(0), 0.5)
    painter.paint(profile(1), 0.1)
    painter.frame()
    expect(el('.behind-1').hidden).toBe(true)
  })

  it('[X10] a registered element is forgotten when it leaves the page', () => {
    const { painter, el, wrapper } = setup()
    const carrier = el('.carrier-0')
    wrapper.unmount()
    painter.paint(profile(0), 0.5) // nothing registered any more: no error, no write
    expect(carrier.style.transform).toBe('')
  })
})

describe('track geometry', () => {
  it('[R6] follow shows the metres that fit at true scale, the whole track shows every metre', async () => {
    const round = ref<Round | null>({
      index: 0,
      distance: 1200,
      horseIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    })
    const mode = ref<'follow' | 'overview'>('follow')
    const viewport = ref<HTMLElement | null>(null)
    let result!: ReturnType<typeof useTrackGeometry>
    mount(
      {
        setup() {
          result = useTrackGeometry(round, mode, viewport)
          return () => h('div')
        },
      },
      { global: { plugins: [createAppI18n('en')] } },
    )
    // jsdom has no layout: the geometry falls back to an 800 × 340 px viewport.
    const follow = result.geometry.value
    expect(follow.metres).toBe(1200)
    expect(follow.visible).toBeLessThan(60)
    expect(result.ticks.value[0]).toMatchObject({ m: 10, pole: false })
    expect(result.ticks.value.find((tick) => tick.m === 50)?.pole).toBe(true)

    mode.value = 'overview'
    await nextTick()
    const overview = result.geometry.value
    expect(overview.visible).toBe(1200)
    expect(result.ticks.value.map((tick) => tick.m)).toEqual([
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100,
    ])
    expect(overview.finishX).toBeCloseTo(overview.startPad + 1200 * overview.pxPerMetre)
    expect(result.worldStyle.value.width).toBe(`${overview.worldWidth}px`)
  })
})
