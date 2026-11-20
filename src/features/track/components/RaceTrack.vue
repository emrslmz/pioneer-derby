<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND, RACE_SPEEDS, ROUND_DISTANCES } from '@/domain/constants'
import { roundRaceForSeed } from '@/domain/game'
import type { RoundRace, SpeedProfile } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useElementSize } from '@/shared/composables/useElementSize'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import BaseSwitch from '@/shared/ui/BaseSwitch.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { useBroadcast } from '../composables/useBroadcast'
import { useRaceLoop } from '../composables/useRaceLoop'
import { cameraStart, TRACK_CAMERA, trueScale, visibleMetres, type CameraMode } from '../camera'
import CommentaryTicker from './CommentaryTicker.vue'
import LiveLeaderboard from './LiveLeaderboard.vue'
import RoundResultBoard from './RoundResultBoard.vue'

/**
 * R6, X13 — the race as a TV broadcast: a camera follows the leaders along a track drawn in metres
 * (turf, rails, furlong poles, starting stalls, finish line), with a race map of the whole
 * distance, live standings and commentary. Between rounds the finished round stays on screen with
 * its result. "Full screen" moves the same live component into a modal <dialog>.
 */
const { t, locale } = useI18n()
const { lapLabel, distance } = useLocale()
const race = useRaceStore()
const {
  status,
  currentRace,
  currentRound,
  currentRoundIndex,
  speed,
  seed,
  isClockRunning,
  autoAdvance,
  canToggle,
  isBetweenRounds,
} = storeToRefs(race)
const { rounds } = storeToRefs(useScheduleStore())
const horsesStore = useHorsesStore()
const reducedMotion = useReducedMotion()

/** A finished round is on screen: between rounds (even if paused there) or at the very end. */
const showingFinished = computed(() => status.value === 'finished' || isBetweenRounds.value)

/** The round on screen: the running one, or the one that just finished during the intermission. */
const displayRace = computed<RoundRace | null>(() => {
  if (!showingFinished.value || status.value === 'finished') return currentRace.value
  const finished = rounds.value[currentRoundIndex.value - 1]
  return finished && seed.value !== null
    ? roundRaceForSeed(finished, horsesStore.horses, seed.value)
    : null
})

const displayRound = computed(() => displayRace.value?.round ?? currentRound.value)
const lap = computed(() =>
  displayRound.value ? lapLabel(displayRound.value.index, displayRound.value.distance) : '',
)
const nextLap = computed(() =>
  showingFinished.value && status.value !== 'finished' && currentRound.value
    ? t('result.next', { lap: lapLabel(currentRound.value.index, currentRound.value.distance) })
    : '',
)

const winnerId = computed(() =>
  showingFinished.value ? (displayRace.value?.result.placings[0]?.horseId ?? null) : null,
)

const lanes = computed(() =>
  Array.from({ length: HORSES_PER_ROUND }, (_, index) => {
    const profile = displayRace.value?.profiles[index]
    const horse = profile ? horsesStore.getHorse(profile.horseId) : undefined
    return { lane: index + 1, profile, horse }
  }),
)

// ── Camera & geometry (px are recomputed only on resize or a new round) ──────
const viewport = ref<HTMLElement | null>(null)
const { width: viewportWidth, height: viewportHeight } = useElementSize(viewport)
const cameraChoice = ref<CameraMode>('follow')
/** Reduced motion never pans the background: the whole track stays still. */
const cameraMode = computed<CameraMode>(() =>
  reducedMotion.value ? 'overview' : cameraChoice.value,
)

const RAIL_PX = 10
const END_PAD_PX = 28

const geometry = computed(() => {
  const metres = displayRound.value?.distance ?? ROUND_DISTANCES[0]
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
  const list: { m: number; x: number; pole: boolean; label: string }[] = []
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
const turfPeriod = computed(() => 2 * geometry.value.marks.stripeMetres * geometry.value.pxPerMetre)
const turfStyle = computed(() => {
  const period = turfPeriod.value
  return {
    width: `calc(100% + ${period}px)`,
    '--stripe': `${period / 2}px`,
    // The grain tile is a whole number of periods wide, so the loop has no seam.
    '--grain': `${period * Math.max(1, Math.round(180 / period))}px`,
  }
})

/** Status card over the track when nothing is moving: eyebrow, title and how to continue. */
const overlay = computed(() => {
  switch (status.value) {
    case 'idle':
      return { eyebrow: '', title: t('track.idleTitle'), hint: t('track.idleHint') }
    case 'ready':
      return { eyebrow: t('track.readyEyebrow'), title: lap.value, hint: t('track.readyHint') }
    case 'paused':
      // Paused between rounds: the result board stays, with its own Resume button.
      return isBetweenRounds.value
        ? null
        : { eyebrow: t('track.pausedEyebrow'), title: lap.value, hint: t('track.pausedHint') }
    default:
      return null
  }
})

const galloping = computed(() => status.value === 'running')

// ── Broadcast: standings + commentary, updated only on change ──────────────
const broadcast = useBroadcast(displayRace)
const { standings, line, photoFinish } = broadcast

const commentaryText = computed(() => {
  const event = line.value
  const round = displayRound.value
  // Nothing is said before the gates open.
  if (!event || !round || status.value === 'idle' || status.value === 'ready') return ''
  const name = event.horseId === null ? '' : (horsesStore.getHorse(event.horseId)?.name ?? '')
  return t(`commentary.${event.code}`, {
    lap: lapLabel(round.index, round.distance),
    name,
    distance: distance(round.distance / 2),
  })
})
// The results panel already announces the winner; don't say it twice.
const spokenCommentary = computed(() => (line.value?.code === 'WINNER' ? '' : commentaryText.value))
// Camera flash from the photo-finish call until the round ends (mounted once, so it fires once).
const flash = computed(
  () =>
    photoFinish.value &&
    status.value === 'running' &&
    (line.value?.code === 'PHOTO_FINISH' || line.value?.code === 'WINNER') &&
    !reducedMotion.value,
)
/** Leader's distance to the line, shown while a round is under way. */
const showToGo = computed(
  () => !showingFinished.value && (status.value === 'running' || status.value === 'paused'),
)

/** The player bar's play button: the same action as the header's Start / Pause. */
const play = computed(() => {
  switch (status.value) {
    case 'running':
      return { icon: 'pause' as const, label: t('actions.pause') }
    case 'intermission':
      return { icon: 'play' as const, label: t('actions.nextRound') }
    case 'paused':
      return { icon: 'play' as const, label: t('actions.resume') }
    default:
      return { icon: 'play' as const, label: t('actions.start') }
  }
})

// ── Theater (full screen) ─────────────────────────────────────────────────
const expanded = ref(false)
const theater = ref<HTMLDialogElement | null>(null)
const theaterSlot = shallowRef<HTMLElement | null>(null)
const host = shallowRef<HTMLElement | null>(null)

const cameraOptions = computed(() => [
  { value: 'follow' as const, label: t('track.camera.follow') },
  { value: 'overview' as const, label: t('track.camera.overview') },
])
const speedOptions = computed(() =>
  RACE_SPEEDS.map((value) => ({
    value,
    label: t('speed.value', { speed: new Intl.NumberFormat(locale.value).format(value) }),
  })),
)

const winnerLane = computed(() => {
  const id = winnerId.value
  return id === null ? null : (displayRace.value?.round.horseIds.indexOf(id) ?? -1) + 1 || null
})

function onTheaterClick(event: MouseEvent) {
  if (event.target === theater.value) closeTheater()
}

async function openTheater() {
  expanded.value = true
  await nextTick()
  const dialog = theater.value
  if (dialog && !dialog.open) {
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }
}

function closeTheater() {
  const dialog = theater.value
  if (dialog?.open) {
    if (typeof dialog.close === 'function') dialog.close()
    else dialog.removeAttribute('open')
  }
  expanded.value = false
}

watch(expanded, async (isExpanded, wasExpanded) => {
  if (!isExpanded && wasExpanded) {
    await nextTick()
    // Return focus to the control that opened the theater.
    host.value?.querySelector<HTMLElement>('[data-testid="track-expand"]')?.focus()
  }
})

// ── Per-frame painting: transforms only, straight to the DOM (X10, ADR 0008) ───
const carriers = new Map<number, HTMLElement>()
const mapDots = new Map<number, HTMLElement>()
const behindLabels = new Map<number, HTMLElement>()
/** Each horse's distance this frame, in metres (scratch data for the frame, not state). */
const runMetres = new Map<number, number>()
const toGo = ref<HTMLElement | null>(null)
const world = ref<HTMLElement | null>(null)
const turf = ref<HTMLElement | null>(null)
const mapWindow = ref<HTMLElement | null>(null)
function setCarrier(lane: number, element: unknown) {
  if (element instanceof HTMLElement) carriers.set(lane, element)
  else carriers.delete(lane)
}
function setMapDot(lane: number, element: unknown) {
  if (element instanceof HTMLElement) mapDots.set(lane, element)
  else mapDots.delete(lane)
}
function setBehindLabel(lane: number, element: unknown) {
  if (element instanceof HTMLElement) behindLabels.set(lane, element)
  else behindLabels.delete(lane)
}

/** Writes text only when it changes, so a steady frame touches nothing. */
function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text
}

let leaderProgress = 0

/** Last whole-metre value written per label: text is only formatted when it changes. */
const shownMetres = new Map<HTMLElement, number>()
watch(locale, () => shownMetres.clear())
function setMetres(element: HTMLElement, metres: number, format: (text: string) => string) {
  if (shownMetres.get(element) === metres) return
  shownMetres.set(element, metres)
  setText(element, format(distance(metres)))
}

/** Horses left behind the true-scale camera get a "−23 m" gap at the left edge of their lane. */
function paintBehindLabels(leaderMetres: number, start: number) {
  const follow = cameraMode.value === 'follow'
  for (const [lane, label] of behindLabels) {
    const run = runMetres.get(lane)
    const behind = follow && run !== undefined && run < start + TRACK_CAMERA.horseMetres
    if (behind) setMetres(label, Math.round(leaderMetres - run), (gap) => `−${gap}`)
    if (label.hidden === behind) label.hidden = !behind
  }
}

useRaceLoop({
  race: displayRace,
  running: isClockRunning,
  // A finished round is drawn at the line; otherwise the store's checkpoint clock.
  clock: (now) => (showingFinished.value ? Number.POSITIVE_INFINITY : race.elapsedMs(now)),
  paint: (profile: SpeedProfile, progress: number) => {
    const { startPad, metres, pxPerMetre } = geometry.value
    const nose = startPad + progress * metres * pxPerMetre
    const carrier = carriers.get(profile.lane)
    if (carrier) carrier.style.transform = `translate3d(calc(${nose.toFixed(2)}px - 100%), 0, 0)`
    // A horse that has crossed the line stops: no more gallop.
    if (carrier) carrier.classList.toggle('carrier--finished', progress >= 1)
    const dot = mapDots.get(profile.lane)
    if (dot) dot.style.transform = `translate3d(${(progress * 100).toFixed(3)}%, 0, 0)`
    runMetres.set(profile.lane, progress * metres)
    if (progress > leaderProgress) leaderProgress = progress
  },
  onFrame: (elapsed) => {
    const { metres, visible, pxPerMetre } = geometry.value
    const leaderMetres = leaderProgress * metres
    const start = cameraStart(leaderMetres, metres, visible)
    leaderProgress = 0
    paintBehindLabels(leaderMetres, start)
    if (toGo.value)
      setMetres(toGo.value, Math.ceil(Math.max(0, metres - leaderMetres)), (left) =>
        t('track.toGo', { distance: left }),
      )
    if (world.value)
      world.value.style.transform = `translate3d(${(-start * pxPerMetre).toFixed(2)}px, 0, 0)`
    if (turf.value)
      turf.value.style.transform = `translate3d(${(-((start * pxPerMetre) % turfPeriod.value)).toFixed(2)}px, 0, 0)`
    if (mapWindow.value)
      mapWindow.value.style.transform = `translate3d(${((start / visible) * 100).toFixed(3)}%, 0, 0)`
    broadcast.update(elapsed)
  },
  repaintOn: [status, geometry, expanded, showToGo, locale],
})
</script>

<template>
  <!-- One root: the panel renders here, or inside the theater <dialog> when expanded. Teleport
       moves the live component without remounting it, so the race keeps running. -->
  <div ref="host" class="track-host">
    <Teleport :to="theaterSlot ?? 'body'" :disabled="!expanded" defer>
      <BasePanel
        id="race-track"
        tone="track"
        icon="track"
        :title="t('panels.track')"
        tabindex="-1"
        :class="{ 'track-panel--expanded': expanded }"
        data-testid="track-panel"
      >
        <template #actions>
          <BaseSegmentedControl
            v-if="!reducedMotion"
            v-model="cameraChoice"
            class="track__camera"
            size="sm"
            :label="t('track.camera.label')"
            :options="cameraOptions"
            data-testid="camera-mode"
          />
          <BaseButton
            v-if="!expanded"
            variant="ghost"
            size="sm"
            icon="expand"
            icon-only
            :aria-label="t('track.expand')"
            :title="t('track.expand')"
            data-testid="track-expand"
            @click="openTheater"
          />
          <BaseButton
            v-else
            variant="ghost"
            size="sm"
            icon="collapse"
            icon-only
            :aria-label="t('track.collapse')"
            :title="t('track.collapse')"
            data-testid="track-collapse"
            @click="closeTheater"
          />
        </template>

        <div class="stage">
          <!-- The track is one labelled image; overlays sit beside it (not inside role="img"), so
               their text and buttons stay reachable for assistive technology. -->
          <div class="track-wrap">
            <div
              class="track"
              :class="{ 'track--running': galloping, 'track--follow': cameraMode === 'follow' }"
              role="img"
              :aria-label="
                t('track.label', { lap: lap || t('round.none'), count: HORSES_PER_ROUND })
              "
              :style="{ '--race-speed': speed }"
              data-testid="race-track"
            >
              <div class="track__numbers" aria-hidden="true">
                <span
                  v-for="{ lane } in lanes"
                  :key="lane"
                  class="track__number"
                  :class="{ 'track__number--winner': lane === winnerLane }"
                  data-testid="track-lane"
                  >{{ lane }}</span
                >
              </div>

              <div ref="viewport" class="track__viewport">
                <!-- Turf, rails and lane lines look the same all along the track: a layer one
                     stripe wider than the screen loops under the camera, so a 2 km track at true
                     scale never needs a 50 000 px textured layer. -->
                <div ref="turf" class="track__turf" :style="turfStyle">
                  <span class="track__rail track__rail--top" />
                  <span class="track__rail track__rail--bottom" />
                  <span
                    v-for="index in HORSES_PER_ROUND - 1"
                    :key="`line-${index}`"
                    class="track__lane-line"
                    :style="{ '--lane': index }"
                  />
                </div>
                <!-- The world is drawn in metres; the camera moves it, the horses move in it. -->
                <div ref="world" class="track__world" :style="worldStyle" data-testid="track-world">
                  <span
                    v-for="tick in ticks"
                    :key="tick.m"
                    class="track__tick"
                    :class="{ 'track__tick--pole': tick.pole }"
                    :style="{ left: `${tick.x}px` }"
                  >
                    <template v-if="tick.pole">
                      <span class="track__pole" />
                      <span class="track__marker-label">{{ tick.label }}</span>
                    </template>
                  </span>
                  <span
                    v-for="{ lane } in lanes"
                    :key="`stall-${lane}`"
                    class="track__stall"
                    :style="{ '--lane': lane - 1 }"
                  />
                  <span class="track__finish">
                    <span class="track__finish-label">{{ t('track.finish') }}</span>
                  </span>

                  <template v-for="{ lane, profile, horse } in lanes" :key="lane">
                    <div
                      v-if="profile && horse"
                      :ref="(element) => setCarrier(profile.lane, element)"
                      class="carrier"
                      :class="{ 'carrier--live': galloping }"
                      :style="{ '--lane': lane - 1 }"
                      data-testid="runner"
                      :data-horse-id="horse.id"
                    >
                      <HorseRunner
                        :color="horse.color.hex"
                        :number="horse.id"
                        :galloping="galloping && !reducedMotion"
                      />
                    </div>
                  </template>
                </div>
                <!-- Gap to the leader for horses the true-scale camera has left behind. -->
                <template v-for="{ lane, profile } in lanes" :key="`behind-${lane}`">
                  <span
                    v-if="profile"
                    :ref="(element) => setBehindLabel(profile.lane, element)"
                    class="track__behind"
                    :style="{ '--lane': lane - 1 }"
                    data-testid="behind-gap"
                    hidden
                  />
                </template>
                <span
                  v-if="winnerLane"
                  class="track__winner-lane"
                  :style="{ '--lane': winnerLane - 1 }"
                />
              </div>
            </div>

            <div v-if="flash" class="track__flash" aria-hidden="true" data-testid="photo-flash" />

            <div v-if="overlay" class="track__overlay" data-testid="track-overlay">
              <div class="track__message" data-testid="track-banner">
                <p v-if="overlay.eyebrow" class="track__eyebrow">{{ overlay.eyebrow }}</p>
                <p class="track__title">{{ overlay.title }}</p>
                <p class="track__hint">{{ overlay.hint }}</p>
                <BaseButton
                  v-if="status === 'idle'"
                  variant="primary"
                  icon="generate"
                  class="track__cta"
                  data-testid="track-generate"
                  @click="race.generateProgram()"
                >
                  {{ t('onboarding.cta') }}
                </BaseButton>
                <BaseButton
                  v-else
                  variant="primary"
                  icon="play"
                  class="track__cta"
                  data-testid="track-play"
                  @click="race.toggle()"
                >
                  {{ t(status === 'paused' ? 'actions.resume' : 'actions.start') }}
                </BaseButton>
              </div>
            </div>
            <div
              v-if="showingFinished && displayRace"
              class="track__overlay track__overlay--result"
            >
              <RoundResultBoard
                :result="displayRace.result"
                :photo-finish="photoFinish"
                :finished="status === 'finished'"
                :auto-advance="autoAdvance && status === 'intermission'"
              >
                <template #next>
                  <span data-testid="result-next">{{ nextLap }}</span>
                  <BaseButton
                    v-if="status === 'intermission'"
                    :variant="autoAdvance ? 'secondary' : 'primary'"
                    size="sm"
                    icon="play"
                    data-testid="next-round"
                    @click="race.nextRound()"
                  >
                    {{ t(autoAdvance ? 'actions.startNow' : 'actions.nextRound') }}
                  </BaseButton>
                  <BaseButton
                    v-else-if="status === 'paused'"
                    variant="primary"
                    size="sm"
                    icon="play"
                    data-testid="track-play"
                    @click="race.toggle()"
                  >
                    {{ t('actions.resume') }}
                  </BaseButton>
                </template>
              </RoundResultBoard>
            </div>
          </div>

          <!-- Race map: the whole distance, every horse and the camera window. -->
          <div v-if="displayRace" class="race-map" data-testid="race-map">
            <!-- Broadcast caption: the round, and while it runs the leader's distance to go. -->
            <span class="race-map__info">
              <span data-testid="track-caption">{{ lap }}</span>
              <span v-if="showToGo" ref="toGo" class="race-map__to-go" data-testid="to-go" />
            </span>
            <div class="race-map__run" aria-hidden="true">
              <span
                ref="mapWindow"
                class="race-map__window"
                :style="{ width: `${(geometry.visible / geometry.metres) * 100}%` }"
              />
              <template v-for="{ lane, profile, horse } in lanes" :key="`dot-${lane}`">
                <span
                  v-if="profile && horse"
                  :ref="(element) => setMapDot(profile.lane, element)"
                  class="race-map__carrier"
                  data-testid="map-dot"
                >
                  <span class="race-map__dot" :style="{ '--coat': horse.color.hex }" />
                </span>
              </template>
            </div>
            <span class="race-map__label" aria-hidden="true">{{ t('track.mapFinish') }}</span>
          </div>

          <!-- Player bar: everything that controls playback, in one place under the picture. -->
          <div class="player" role="group" :aria-label="t('track.controls')" data-testid="player">
            <BaseButton
              variant="primary"
              size="sm"
              :icon="play.icon"
              icon-only
              :aria-label="play.label"
              :title="play.label"
              :disabled="!canToggle"
              data-testid="player-toggle"
              @click="race.toggle()"
            />
            <BaseSegmentedControl
              :model-value="speed"
              class="player__speed"
              :options="speedOptions"
              :label="t('speed.label')"
              size="sm"
              data-testid="player-speed"
              @update:model-value="race.setSpeed"
            />
            <BaseSwitch
              :model-value="autoAdvance"
              :label="t('actions.autoAdvance')"
              :hint="t('actions.autoAdvanceHint')"
              data-testid="auto-advance"
              @update:model-value="race.setAutoAdvance"
            />
          </div>

          <LiveLeaderboard :standings="standings" />
          <CommentaryTicker :text="commentaryText" :spoken="spokenCommentary" :live="galloping" />
        </div>
      </BasePanel>
    </Teleport>

    <dialog
      ref="theater"
      class="theater"
      :aria-label="t('track.theater')"
      data-testid="track-theater"
      @close="expanded = false"
      @click="onTheaterClick"
    >
      <div ref="theaterSlot" class="theater__slot" />
    </dialog>
  </div>
</template>

<style scoped lang="scss">
.track-host {
  display: flex;
  flex-direction: column;
  min-height: 0;

  > :deep(.panel) {
    flex: 1;
  }
}

.track-host :deep(.panel__body) {
  overflow: auto;
  overscroll-behavior: contain;
}

.stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;

  > * {
    flex-shrink: 0;
    min-width: 0;
  }
}

// Camera choice needs room; on small phones the track simply follows.
.track__camera {
  display: none !important;

  @media (min-width: 480px) {
    display: inline-flex !important;
  }
}

// Player bar: play, speed, auto next round | camera, full screen.
.player {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.track-wrap {
  position: relative;
  // Lets the result board adapt to the track's height (@container track).
  container: track / size;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  // Short laptop screens (720 px) still fit the whole middle column without scrolling.
  min-height: 220px;
}

.track {
  --rail: 10px;
  --lane-h: calc((100% - 2 * var(--rail)) / 10);

  display: grid;
  flex: 1;
  grid-template-columns: 2rem 1fr;
  // Short laptop screens (720 px) still fit the whole middle column without scrolling.
  min-height: 220px;
  background: #0f3a22;
}

.track__numbers {
  display: grid;
  grid-template-rows: repeat(10, 1fr);
  padding-block: var(--rail);
  border-right: 3px solid #f2f2f2;
  background: #0f3a22;
}

.track__number {
  display: grid;
  place-items: center;
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;

  &:last-child {
    border-bottom: 0;
  }
}

.track__number--winner {
  background: var(--color-gold);
  color: #1a1a1a;
}

.track__viewport {
  position: relative;
  min-width: 0;
  // clip, not hidden: a clipped box can never be scrolled, not even by focus or script.
  overflow: hidden;
  overflow: clip;
}

// Turf that loops under the camera (see the template): moved by less than one stripe period.
.track__turf {
  position: absolute;
  inset: 0 auto 0 0;
  transform: translate3d(0, 0, 0);
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1 0.35' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.02  0 0 0 0 0.12  0 0 0 0 0.03  0 0 0 0.55 -0.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")
      0 0 / var(--grain) 180px,
    linear-gradient(
      180deg,
      var(--color-turf-shade),
      transparent 16%,
      transparent 84%,
      var(--color-turf-shade)
    ),
    repeating-linear-gradient(
      90deg,
      var(--color-turf-1) 0 var(--stripe),
      var(--color-turf-2) var(--stripe) calc(2 * var(--stripe))
    );
}

// The world: everything placed in metres. Its transform is the camera. No background: a huge
// layer of transparent tiles costs nothing to move.
.track__world {
  position: absolute;
  inset: 0 auto 0 0;
  transform: translate3d(0, 0, 0);
}

.track--follow .track__world,
.track--follow .track__turf {
  will-change: transform;
}

// White running rails with posts, top and bottom.
.track__rail {
  position: absolute;
  inset-inline: 0;
  z-index: 1;
  height: var(--rail);
  background:
    linear-gradient(#f4f4f4, #f4f4f4) 0 2px / 100% 3px no-repeat,
    // Posts every half stripe, so the looping turf layer has no seam.
    repeating-linear-gradient(90deg, #d9dde3 0 3px, transparent 3px calc(var(--stripe) / 2)) 0 0 /
      100% 10px;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
}

.track__rail--top {
  top: 0;
}

.track__rail--bottom {
  bottom: 0;
  transform: scaleY(-1);
}

.track__lane-line {
  position: absolute;
  inset-inline: 0;
  top: calc(var(--rail) + var(--lane) * var(--lane-h));
  border-top: 1px dashed rgb(255 255 255 / 0.28);
}

.track__tick {
  position: absolute;
  top: var(--rail);
  bottom: var(--rail);
  border-left: 1px dashed rgb(255 255 255 / 0.14);
}

.track__tick--pole {
  border-left-color: rgb(255 255 255 / 0.24);
}

// Furlong-style pole on the outer rail.
.track__pole {
  position: absolute;
  top: calc(-1 * var(--rail));
  left: -3px;
  width: 6px;
  height: 18px;
  border-radius: 2px;
  background: repeating-linear-gradient(180deg, #e53935 0 4px, #fff 4px 8px);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
}

.track__marker-label {
  position: absolute;
  top: 2px;
  left: 6px;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  background: rgb(0 0 0 / 0.4);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

// Starting stall per lane: horses begin inside and run out of the front gate.
.track__stall {
  position: absolute;
  top: calc(var(--rail) + var(--lane) * var(--lane-h));
  left: 0;
  width: var(--start-pad);
  height: var(--lane-h);
  border-right: 4px solid #d6dbe3;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.08) 1px, transparent 1px) 0 0 / 8px 100%,
    linear-gradient(180deg, rgb(10 14 22 / 0.55), rgb(30 36 48 / 0.35));
  box-shadow:
    inset 0 2px 0 #9aa3b2,
    inset 0 -2px 0 #9aa3b2,
    2px 0 4px rgb(0 0 0 / 0.35);
}

.track__finish {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--finish-x);
  z-index: 1;
  width: 10px;
  background:
    repeating-conic-gradient(#fff 0 25%, #111 0 50%) 0 0 / 10px 10px,
    #fff;
  box-shadow:
    -2px 0 0 var(--color-finish),
    0 0 18px rgb(255 59 59 / 0.45);
}

.track__finish-label {
  position: absolute;
  top: 50%;
  right: 14px;
  color: var(--color-finish);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  transform: translateY(-50%) rotate(-90deg) translateX(50%);
  transform-origin: right center;
  white-space: nowrap;
}

// A runner: lane row, nose at its x (the transform), width from the horse's aspect ratio.
.carrier {
  position: absolute;
  top: calc(var(--rail) + var(--lane) * var(--lane-h) + var(--lane-h) * 0.05);
  left: 0;
  z-index: 2;
  height: calc(var(--lane-h) * 0.9);
  aspect-ratio: 72 / 46;
  transform: translate3d(0, 0, 0);
}

.carrier--live {
  will-change: transform;
}

// Past the line the horse stands still.
.carrier--finished :deep(.runner *) {
  animation: none !important;
}

// "−23 m": a horse behind the camera, at the left edge of its lane.
.track__behind {
  position: absolute;
  top: calc(var(--rail) + var(--lane) * var(--lane-h) + var(--lane-h) / 2);
  left: 4px;
  z-index: 2;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: rgb(0 0 0 / 0.55);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transform: translateY(-50%);

  &::before {
    content: '◀ ';
    opacity: 0.7;
  }

  &[hidden] {
    display: none;
  }
}

.carrier :deep(.runner) {
  width: 100%;
  height: 100%;
}

.track__winner-lane {
  position: absolute;
  inset-inline: 0;
  top: calc(var(--rail) + var(--lane) * (100% - 2 * var(--rail)) / 10);
  height: calc((100% - 2 * var(--rail)) / 10);
  background: linear-gradient(90deg, transparent, rgb(245 197 24 / 0.32));
  box-shadow: inset 0 0 0 2px var(--color-gold);
  pointer-events: none;
}

.track__overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  pointer-events: none;
}

.track__overlay--result {
  // Keep the horses at the finish line (right) in view.
  justify-items: start;
  padding-left: calc(2rem + var(--space-4));
}

// The board has buttons (Start now, Resume) and may scroll: unlike the overlay, it takes the pointer.
.track__overlay--result > * {
  pointer-events: auto;
}

.track__message {
  display: grid;
  gap: var(--space-1);
  max-width: min(34ch, 100%);
  padding: var(--space-3) var(--space-5);
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: var(--radius-lg);
  background: rgb(6 10 22 / 0.8);
  color: #fff;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
}

.track__cta {
  justify-self: center;
  margin-top: var(--space-2);
  // The overlay ignores the pointer so horses stay hoverable; the button must not.
  pointer-events: auto;
}

.track__eyebrow {
  color: var(--color-gold);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.track__title {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1.1;
}

.track__hint {
  color: rgb(255 255 255 / 0.8);
  font-size: var(--font-size-sm);
}

// Camera flash for a photo finish (skipped under reduced motion).
.track__flash {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  animation: flash 700ms ease-out;
}

@keyframes flash {
  10% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
  }
}

// Race map: the whole distance at a glance.
.race-map {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
}

.race-map__info {
  display: flex;
  gap: var(--space-2);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.race-map__to-go {
  color: var(--color-text);

  &::before {
    margin-right: var(--space-2);
    color: var(--color-text-muted);
    content: '·';
  }
}

.race-map__label {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.race-map__run {
  position: relative;
  flex: 1;
  height: 16px;
  // The dot carriers are translated by up to 100 % of this box; clip them so they never widen
  // the panel (that made the whole track scroll sideways).
  overflow: hidden;
  overflow: clip;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-turf-2) 70%, var(--color-surface-sunken));
}

.race-map__window {
  position: absolute;
  inset-block: -2px;
  left: 0;
  border: 2px solid #fff;
  border-radius: var(--radius-sm);
  background: rgb(255 255 255 / 0.12);
  transform: translate3d(0, 0, 0);
}

// Same carrier trick as the runners: translateX(progress × 100%) of the carrier's width. Inset
// by a dot radius, so a dot at the start or the finish is still fully inside the clipped run.
.race-map__carrier {
  position: absolute;
  inset: 0 6px;
  transform: translate3d(0, 0, 0);
  pointer-events: none;
}

.race-map__dot {
  position: absolute;
  top: 50%;
  left: 0;
  width: 10px;
  height: 10px;
  border: 1.5px solid rgb(0 0 0 / 0.55);
  border-radius: 50%;
  background: var(--coat);
  transform: translate(-50%, -50%);
}

// Theater: a modal <dialog> the live panel is teleported into.
.theater {
  width: min(1400px, calc(100vw - 2 * var(--space-4)));
  height: calc(100dvh - 2 * var(--space-4));
  max-width: none;
  max-height: none;
  margin: auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-lg);
  background: transparent;

  &::backdrop {
    background: rgb(4 7 16 / 0.82);
    backdrop-filter: blur(4px);
  }
}

.theater__slot {
  display: flex;
  height: 100%;

  > :deep(.panel) {
    flex: 1;
  }
}

.track-panel--expanded .track {
  min-height: 300px;
}
</style>
