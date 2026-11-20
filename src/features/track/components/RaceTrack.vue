<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RACE_SPEEDS } from '@/domain/constants'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useRaceStore } from '@/stores/race.store'
import { type CameraMode } from '../camera'
import { useBroadcast } from '../composables/useBroadcast'
import { useCommentary } from '../composables/useCommentary'
import { useDisplayedRound } from '../composables/useDisplayedRound'
import { useRaceLoop } from '../composables/useRaceLoop'
import { useTheater } from '../composables/useTheater'
import { useTrackCard } from '../composables/useTrackCard'
import { useTrackGeometry } from '../composables/useTrackGeometry'
import { useTrackPainter } from '../composables/useTrackPainter'
import CommentaryTicker from './CommentaryTicker.vue'
import LiveLeaderboard from './LiveLeaderboard.vue'
import PlayerBar from './PlayerBar.vue'
import RaceMap from './RaceMap.vue'
import TrackOverlays from './TrackOverlays.vue'
import TrackWorld from './TrackWorld.vue'

/**
 * R6, X13 — the race as a TV broadcast: a camera follows the leaders along a track drawn in metres
 * (TrackWorld), with a race map of the whole distance (RaceMap), live standings and commentary.
 * Between rounds the finished round stays on screen with its result (TrackOverlays). "Full screen"
 * moves the same live component into a modal <dialog> (useTheater). This component wires the
 * pieces: the state and the race loop live here, the markup and its styles in the children.
 */
const { t, locale } = useI18n()
const { distance } = useLocale()
const race = useRaceStore()
const { status, speed, seed, isClockRunning, autoAdvance, canToggle } = storeToRefs(race)
const reducedMotion = useReducedMotion()

const { showingFinished, displayRace, displayRound, lap, nextLap, lanes, winnerLane, showToGo } =
  useDisplayedRound()
const galloping = computed(() => status.value === 'running')

// ── Camera & geometry ─────────────────────────────────────────────────────────
const cameraChoice = ref<CameraMode>('follow')
/** Reduced motion never pans the background: the whole track stays still. */
const cameraMode = computed<CameraMode>(() =>
  reducedMotion.value ? 'overview' : cameraChoice.value,
)
const world = ref<InstanceType<typeof TrackWorld> | null>(null)
const viewport = computed(() => world.value?.viewport ?? null)
const { geometry, ticks, worldStyle, turfPeriod, turfStyle } = useTrackGeometry(
  displayRound,
  cameraMode,
  viewport,
)

const { overlay, play } = useTrackCard(lap)

// ── Broadcast: standings + commentary, updated only on change ─────────────────
const broadcast = useBroadcast(displayRace)
const { standings, line, photoFinish } = broadcast

const { commentaryText, spokenCommentary } = useCommentary(line, displayRound)
// Camera flash from the photo-finish call until the round ends (mounted once, so it fires once).
const flash = computed(
  () =>
    photoFinish.value &&
    status.value === 'running' &&
    (line.value?.code === 'PHOTO_FINISH' || line.value?.code === 'WINNER') &&
    !reducedMotion.value,
)

// ── Controls ──────────────────────────────────────────────────────────────────
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

// ── Theater (full screen) ─────────────────────────────────────────────────────
const host = ref<HTMLElement | null>(null)
const { expanded, theater, theaterSlot, open, close, onBackdropClick } = useTheater(host)

// ── Per-frame painting: transforms only, straight to the DOM (X10, ADR 0008) ──────
const painter = useTrackPainter({
  geometry,
  cameraMode,
  turfPeriod,
  locale,
  formatDistance: distance,
  formatToGo: (left) => t('track.toGo', { distance: left }),
})

useRaceLoop({
  race: displayRace,
  running: isClockRunning,
  // A finished round is drawn at the line; otherwise the store's checkpoint clock.
  clock: (now) => (showingFinished.value ? Number.POSITIVE_INFINITY : race.elapsedMs(now)),
  paint: painter.paint,
  onFrame: (elapsed) => {
    painter.frame()
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
            @click="open"
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
            @click="close"
          />
        </template>

        <div class="stage">
          <!-- The track is one labelled image; overlays sit beside it (not inside role="img"), so
               their text and buttons stay reachable for assistive technology. -->
          <div class="track-wrap">
            <TrackWorld
              ref="world"
              :lanes="lanes"
              :ticks="ticks"
              :world-style="worldStyle"
              :turf-style="turfStyle"
              :galloping="galloping"
              :following="cameraMode === 'follow'"
              :reduced-motion="reducedMotion"
              :speed="speed"
              :lap="lap"
              :winner-lane="winnerLane"
            />
            <TrackOverlays
              :display-race="displayRace"
              :seed="seed"
              :status="status"
              :flash="flash"
              :overlay="overlay"
              :showing-finished="showingFinished"
              :photo-finish="photoFinish"
              :auto-advance="autoAdvance"
              :next-lap="nextLap"
              @generate="race.generateProgram()"
              @toggle="race.toggle()"
              @next-round="race.nextRound()"
            />
          </div>

          <RaceMap
            :lanes="lanes"
            :lap="lap"
            :show-to-go="showToGo"
            :has-race="displayRace !== null"
            :visible="geometry.visible"
            :metres="geometry.metres"
          />

          <PlayerBar
            :play="play"
            :can-toggle="canToggle"
            :speed="speed"
            :speed-options="speedOptions"
            :auto-advance="autoAdvance"
            @toggle="race.toggle()"
            @update:speed="race.setSpeed"
            @update:auto-advance="race.setAutoAdvance"
          />

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
      @click="onBackdropClick"
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
    background: var(--track-backdrop);
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
