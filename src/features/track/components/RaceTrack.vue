<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import { roundRaceForSeed } from '@/domain/game'
import type { RoundRace, SpeedProfile } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import { useBroadcast } from '../composables/useBroadcast'
import { useRaceLoop } from '../composables/useRaceLoop'
import CommentaryTicker from './CommentaryTicker.vue'
import FinishLine from './FinishLine.vue'
import HorseRunner from './HorseRunner.vue'
import LiveLeaderboard from './LiveLeaderboard.vue'
import RoundResultBoard from './RoundResultBoard.vue'
import TrackLane from './TrackLane.vue'

/**
 * R6, X13 — ten lanes, coloured runners moving by transform, finish line, lap caption below,
 * live standings and commentary. Between rounds the finished round stays on screen with its
 * podium; the next line-up appears when its round starts.
 */
const { t } = useI18n()
const { lapLabel, distance } = useLocale()
const race = useRaceStore()
const { status, currentRace, currentRound, currentRoundIndex, speed, seed, isClockRunning } =
  storeToRefs(race)
const { rounds } = storeToRefs(useScheduleStore())
const horsesStore = useHorsesStore()
const reducedMotion = useReducedMotion()

const showingFinished = computed(
  () => status.value === 'intermission' || status.value === 'finished',
)

/** The round on screen: the running one, or the one that just finished during the intermission. */
const displayRace = computed<RoundRace | null>(() => {
  if (status.value !== 'intermission') return currentRace.value
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
  status.value === 'intermission' && currentRound.value
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

/** Every 200 m, like furlong poles. */
const markers = computed(() => {
  const metres = displayRound.value?.distance ?? 0
  const marks: { at: number; label: string }[] = []
  for (let m = 200; m < metres; m += 200) marks.push({ at: m / metres, label: distance(m) })
  return marks
})

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
const showBroadcast = computed(() => status.value !== 'idle' && status.value !== 'ready')

// ── Per-frame painting writes straight to the carriers' style (X10) ────────
const carriers = new Map<number, HTMLElement>()
function setCarrier(lane: number, element: unknown) {
  if (element instanceof HTMLElement) carriers.set(lane, element)
  else carriers.delete(lane)
}

useRaceLoop({
  race: displayRace,
  running: isClockRunning,
  // A finished round is drawn at the line; otherwise the store's checkpoint clock.
  clock: (now) => (showingFinished.value ? Number.POSITIVE_INFINITY : race.elapsedMs(now)),
  paint: (profile: SpeedProfile, progress: number) => {
    const carrier = carriers.get(profile.lane)
    if (carrier) carrier.style.transform = `translate3d(${(progress * 100).toFixed(3)}%, 0, 0)`
  },
  onFrame: broadcast.update,
  repaintOn: [status],
})
</script>

<template>
  <BasePanel
    id="race-track"
    tone="track"
    icon="track"
    :title="t('panels.track')"
    tabindex="-1"
    data-testid="track-panel"
  >
    <figure class="stage">
      <!-- The track is one labelled image; overlays sit beside it (not inside role="img"), so
           their text and buttons stay reachable for assistive technology. -->
      <div class="track-wrap">
        <div
          class="track"
          :class="{ 'track--running': galloping }"
          role="img"
          :aria-label="t('track.label', { lap: lap || t('round.none'), count: HORSES_PER_ROUND })"
          :style="{ '--race-speed': speed }"
          data-testid="race-track"
        >
          <span class="track__rail track__rail--top" aria-hidden="true" />
          <span class="track__rail track__rail--bottom" aria-hidden="true" />
          <div class="track__markers" aria-hidden="true">
            <span
              v-for="marker in markers"
              :key="marker.label"
              class="track__marker"
              :style="{ '--at': marker.at }"
            >
              <span class="track__pole" />
              <span class="track__marker-label">{{ marker.label }}</span>
            </span>
          </div>

          <TrackLane
            v-for="{ lane, profile, horse } in lanes"
            :key="lane"
            :lane="lane"
            :lane-label="t('track.lane', { lane })"
            :winner="!!horse && horse.id === winnerId"
          >
            <div
              v-if="profile && horse"
              :ref="(element) => setCarrier(profile.lane, element)"
              class="carrier"
              :class="{ 'carrier--live': galloping }"
              data-testid="runner"
              :data-horse-id="horse.id"
            >
              <HorseRunner
                :color="horse.color.hex"
                :number="horse.id"
                :galloping="galloping && !reducedMotion"
              />
            </div>
          </TrackLane>

          <FinishLine :label="t('track.finish')" />
        </div>
        <div v-if="flash" class="track__flash" aria-hidden="true" data-testid="photo-flash" />

        <div v-if="showingFinished && displayRace" class="track__overlay track__overlay--result">
          <RoundResultBoard
            :result="displayRace.result"
            :photo-finish="photoFinish"
            :finished="status === 'finished'"
          >
            <template #next>
              <span data-testid="result-next">{{ nextLap }}</span>
            </template>
          </RoundResultBoard>
        </div>
        <div v-else-if="overlay" class="track__overlay" data-testid="track-overlay">
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

      <template v-if="showBroadcast">
        <LiveLeaderboard :standings="standings" />
        <CommentaryTicker :text="commentaryText" :spoken="spokenCommentary" :live="galloping" />
      </template>

      <figcaption v-if="lap" class="stage__caption" data-testid="track-caption">
        {{ lap }}
      </figcaption>
    </figure>
  </BasePanel>
</template>

<style scoped lang="scss">
.stage {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.track-wrap {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.track {
  position: relative;
  display: grid;
  flex: 1;
  grid-template-rows: repeat(10, minmax(32px, 1fr));
  min-height: 340px;
  overflow: hidden;
  // Turf: fine grass grain (SVG noise) over broad mowing stripes, a vignette for depth,
  // and rails top and bottom.
  border-block: 0;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1 0.35' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.02  0 0 0 0 0.12  0 0 0 0 0.03  0 0 0 0.55 -0.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E"),
    linear-gradient(
      180deg,
      var(--color-turf-shade),
      transparent 16%,
      transparent 84%,
      var(--color-turf-shade)
    ),
    repeating-linear-gradient(90deg, var(--color-turf-1) 0 64px, var(--color-turf-2) 64px 128px);
  padding-block: 10px;
  // Leave room on the right for the finish line.
  padding-right: 10px;
}

.carrier {
  --runner-height: 94cqh;
  --runner-width: calc(var(--runner-height) * 72 / 46);

  position: absolute;
  top: 3cqh;
  bottom: 3cqh;
  left: 0;
  // Run length: the horse's nose reaches the finish at 100%.
  width: calc(100% - var(--runner-width));
  transform: translate3d(0, 0, 0);
}

.carrier--live {
  will-change: transform;
}

.carrier :deep(.runner) {
  width: var(--runner-width);
  height: var(--runner-height);
}

.track__markers {
  position: absolute;
  inset: 0 10px 0 2rem;
  pointer-events: none;
}

.track__marker {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--at) * 100%);
  border-left: 1px dashed rgb(255 255 255 / 0.16);
}

// Furlong-style pole on the outer rail.
.track__pole {
  position: absolute;
  top: 0;
  left: -3px;
  width: 6px;
  height: 18px;
  border-radius: 2px;
  background: repeating-linear-gradient(180deg, #e53935 0 4px, #fff 4px 8px);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
}

// White running rails with posts, top and bottom.
.track__rail {
  position: absolute;
  inset-inline: 0;
  z-index: 1;
  height: 10px;
  background:
    linear-gradient(#f4f4f4, #f4f4f4) 0 2px / 100% 3px no-repeat,
    repeating-linear-gradient(90deg, #d9dde3 0 3px, transparent 3px 36px) 0 0 / 100% 10px;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
  pointer-events: none;
}

.track__rail--top {
  top: 0;
}

.track__rail--bottom {
  bottom: 0;
  transform: scaleY(-1);
}

.track__marker-label {
  position: absolute;
  top: 12px;
  left: 6px;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  background: rgb(0 0 0 / 0.35);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.track__overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
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
  z-index: 3;
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
</style>
