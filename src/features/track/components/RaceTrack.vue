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
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { useBroadcast } from '../composables/useBroadcast'
import { useRaceLoop } from '../composables/useRaceLoop'
import { cameraStart, TRACK_CAMERA, visibleMetres, type CameraMode } from '../camera'
import CommentaryTicker from './CommentaryTicker.vue'
import HorseRunner from './HorseRunner.vue'
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
} = storeToRefs(race)
const { rounds } = storeToRefs(useScheduleStore())
const horsesStore = useHorsesStore()
const reducedMotion = useReducedMotion()

const showingFinished = computed(
  () =>
    status.value === 'intermission' ||
    status.value === 'finished' ||
    (status.value === 'paused' &&
      race.completedResults.length === currentRoundIndex.value &&
      currentRoundIndex.value > 0),
)

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
  const visible = visibleMetres(metres, cameraMode.value)
  const pxPerMetre = (width - startPad - END_PAD_PX) / visible
  return {
    metres,
    visible,
    pxPerMetre,
    startPad,
    finishX: startPad + metres * pxPerMetre,
    worldWidth: startPad + metres * pxPerMetre + END_PAD_PX,
  }
})

/** Distance ticks every 100 m; every 200 m a red-and-white pole with a label. */
const ticks = computed(() => {
  const { metres, startPad, pxPerMetre } = geometry.value
  const list: { m: number; x: number; pole: boolean; label: string }[] = []
  for (let m = TRACK_CAMERA.tickMetres; m < metres; m += TRACK_CAMERA.tickMetres) {
    list.push({
      m,
      x: startPad + m * pxPerMetre,
      pole: m % TRACK_CAMERA.poleMetres === 0,
      label: distance(m),
    })
  }
  return list
})

const worldStyle = computed(() => ({
  width: `${geometry.value.worldWidth}px`,
  '--start-pad': `${geometry.value.startPad}px`,
  '--finish-x': `${geometry.value.finishX}px`,
  '--stripe': `${TRACK_CAMERA.stripeMetres * geometry.value.pxPerMetre}px`,
}))

/** Status card over the track when nothing is moving: eyebrow, title and how to continue. */
const overlay = computed(() => {
  switch (status.value) {
    case 'idle':
      return { eyebrow: '', title: t('track.idleTitle'), hint: t('track.idleHint') }
    case 'ready':
      return { eyebrow: t('track.readyEyebrow'), title: lap.value, hint: t('track.readyHint') }
    case 'paused':
      return { eyebrow: t('track.pausedEyebrow'), title: lap.value, hint: t('track.pausedHint') }
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
  if (!event || !round) return ''
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
const showBroadcast = computed(() => status.value === 'running' || status.value === 'paused')

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
const world = ref<HTMLElement | null>(null)
const mapWindow = ref<HTMLElement | null>(null)
function setCarrier(lane: number, element: unknown) {
  if (element instanceof HTMLElement) carriers.set(lane, element)
  else carriers.delete(lane)
}
function setMapDot(lane: number, element: unknown) {
  if (element instanceof HTMLElement) mapDots.set(lane, element)
  else mapDots.delete(lane)
}

let leaderProgress = 0

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
    const dot = mapDots.get(profile.lane)
    if (dot) dot.style.transform = `translate3d(${(progress * 100).toFixed(3)}%, 0, 0)`
    if (progress > leaderProgress) leaderProgress = progress
  },
  onFrame: (elapsed) => {
    const { metres, visible, pxPerMetre } = geometry.value
    const start = cameraStart(leaderProgress * metres, metres, visible)
    leaderProgress = 0
    if (world.value)
      world.value.style.transform = `translate3d(${(-start * pxPerMetre).toFixed(2)}px, 0, 0)`
    if (mapWindow.value)
      mapWindow.value.style.transform = `translate3d(${((start / visible) * 100).toFixed(3)}%, 0, 0)`
    broadcast.update(elapsed)
  },
  repaintOn: [status, geometry, expanded],
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
          <template v-if="expanded">
            <BaseSegmentedControl
              :model-value="speed"
              :options="speedOptions"
              :label="t('speed.label')"
              size="sm"
              @update:model-value="race.setSpeed"
            />
            <label class="theater__auto"
              ><input
                type="checkbox"
                :checked="autoAdvance"
                @change="race.setAutoAdvance(($event.target as HTMLInputElement).checked)"
              />{{ t('actions.autoAdvance') }}</label
            >
          </template>
          <BaseButton
            v-if="expanded"
            variant="primary"
            size="sm"
            :icon="status === 'running' ? 'pause' : 'play'"
            :disabled="!canToggle"
            data-testid="theater-toggle"
            @click="race.toggle()"
          >
            {{
              t(
                status === 'running'
                  ? 'actions.pause'
                  : status === 'intermission'
                    ? 'actions.nextRound'
                    : status === 'paused'
                      ? 'actions.resume'
                      : 'actions.start',
              )
            }}
          </BaseButton>
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

        <figure class="stage">
          <div v-if="$slots.prediction" class="stage__prediction"><slot name="prediction" /></div>
          <div
            class="track__banner"
            :class="{ 'track__banner--paused': status === 'paused' }"
            data-testid="track-banner"
          >
            <template v-if="status === 'paused' || status === 'ready'">
              <strong>{{ overlay?.eyebrow }}</strong>
              <span>{{ overlay?.hint }}</span>
              <BaseButton
                size="sm"
                :variant="status === 'paused' ? 'primary' : 'ghost'"
                icon="play"
                @click="race.toggle()"
              >
                {{ t(status === 'paused' ? 'actions.resume' : 'actions.start') }}
              </BaseButton>
            </template>
            <template v-else>
              <strong>{{ t(`status.${status}`) }}</strong>
              <span>{{ nextLap || lap || t('track.idleHint') }}</span>
              <BaseButton
                v-if="status === 'intermission'"
                size="sm"
                variant="primary"
                @click="race.nextRound()"
                >{{ t('actions.nextRound') }}</BaseButton
              >
            </template>
          </div>
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
                <!-- The world is drawn in metres; the camera moves it, the horses move in it. -->
                <div ref="world" class="track__world" :style="worldStyle" data-testid="track-world">
                  <span class="track__rail track__rail--top" />
                  <span class="track__rail track__rail--bottom" />
                  <span
                    v-for="index in HORSES_PER_ROUND - 1"
                    :key="`line-${index}`"
                    class="track__lane-line"
                    :style="{ '--lane': index }"
                  />
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
                <span
                  v-if="winnerLane"
                  class="track__winner-lane"
                  :style="{ '--lane': winnerLane - 1 }"
                />
              </div>
            </div>

            <div v-if="flash" class="track__flash" aria-hidden="true" data-testid="photo-flash" />

            <div
              v-if="status === 'idle' && overlay"
              class="track__overlay"
              data-testid="track-overlay"
            >
              <div class="track__message">
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
              </div>
            </div>
          </div>

          <RoundResultBoard
            v-if="showingFinished && displayRace"
            :result="displayRace.result"
            :photo-finish="photoFinish"
            :finished="status === 'finished'"
            :auto-advance="autoAdvance && status === 'intermission'"
          >
            <template #next>
              <span data-testid="result-next">{{ nextLap }}</span>
              <BaseButton
                v-if="status === 'intermission'"
                variant="primary"
                size="sm"
                data-testid="next-round"
                @click="race.nextRound()"
              >
                {{ t('actions.nextRound') }}
              </BaseButton>
              <span v-if="!autoAdvance">{{ t('result.waiting') }}</span>
            </template>
          </RoundResultBoard>

          <!-- Race map: the whole distance, every horse and the camera window. -->
          <div v-if="displayRace" class="race-map" aria-hidden="true" data-testid="race-map">
            <span class="race-map__label">{{ t('track.mapStart') }}</span>
            <div class="race-map__run">
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
            <span class="race-map__label">{{ t('track.mapFinish') }}</span>
          </div>

          <template v-if="showBroadcast">
            <LiveLeaderboard :standings="standings" />
            <CommentaryTicker :text="commentaryText" :spoken="spokenCommentary" :live="galloping" />
          </template>

          <figcaption v-if="lap" class="stage__caption" data-testid="track-caption">
            {{ lap }}
          </figcaption>
        </figure>
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

.track__camera {
  display: none !important;

  @media (min-width: 480px) {
    display: inline-flex !important;
  }
}

.stage {
  display: flex;
  flex-direction: column;
  height: 100%;

  > * {
    flex-shrink: 0;
  }
}

.stage__prediction {
  padding: var(--space-2);
}

.track__banner {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
  min-height: 48px;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);

  strong {
    color: var(--color-text);
  }
  span {
    flex: 1;
  }
}

.track__banner--paused {
  border-left: 4px solid var(--color-warning);
  background: var(--color-warning-soft);
}

.theater__auto {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
}

.track-panel--expanded :deep(.panel__header) {
  flex-wrap: wrap;
}

.track-panel--expanded :deep(.panel__actions) {
  flex-wrap: wrap;
}

.track-panel--expanded :deep(.panel__body) {
  overflow: auto;
}

.track-wrap {
  position: relative;
  display: flex;
  flex: 1 0 340px;
  flex-direction: column;
  min-height: 340px;
}

.track {
  --rail: 10px;
  --lane-h: calc((100% - 2 * var(--rail)) / 10);

  display: grid;
  flex: 1;
  grid-template-columns: 2rem 1fr;
  min-height: 340px;
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
  overflow: hidden;
}

// The world: everything placed in metres. Its transform is the camera.
.track__world {
  position: absolute;
  inset: 0 auto 0 0;
  transform: translate3d(0, 0, 0);
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1 0.35' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.02  0 0 0 0 0.12  0 0 0 0 0.03  0 0 0 0.55 -0.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E"),
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

.track--follow .track__world {
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
    repeating-linear-gradient(90deg, #d9dde3 0 3px, transparent 3px 36px) 0 0 / 100% 10px;
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

// Same carrier trick as the runners: translateX(progress × 100%) of the run's width.
.race-map__carrier {
  position: absolute;
  inset: 0;
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

.stage__caption {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-finish);
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
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
