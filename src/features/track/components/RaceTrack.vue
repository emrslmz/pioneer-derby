<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import { roundRaceForSeed } from '@/domain/game'
import type { RoundRace, SpeedProfile } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
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
import PodiumCard from './PodiumCard.vue'
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
    ? t('track.intermission', {
        lap: lapLabel(currentRound.value.index, currentRound.value.distance),
      })
    : status.value === 'finished'
      ? t('track.finished')
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

const overlay = computed(() => {
  switch (status.value) {
    case 'idle':
      return t('track.idle')
    case 'ready':
      return t('track.ready', { lap: lap.value })
    case 'paused':
      return t('track.paused')
    default:
      return ''
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
      <div
        class="track"
        :class="{ 'track--running': galloping }"
        role="img"
        :aria-label="t('track.label', { lap: lap || t('round.none'), count: HORSES_PER_ROUND })"
        :style="{ '--race-speed': speed }"
        data-testid="race-track"
      >
        <div class="track__markers" aria-hidden="true">
          <span
            v-for="marker in markers"
            :key="marker.label"
            class="track__marker"
            :style="{ '--at': marker.at }"
          >
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

        <div v-if="flash" class="track__flash" aria-hidden="true" data-testid="photo-flash" />

        <div v-if="showingFinished && displayRace" class="track__overlay">
          <PodiumCard :result="displayRace.result" :photo-finish="photoFinish" :next="nextLap" />
        </div>
        <p v-else-if="overlay" class="track__overlay" data-testid="track-overlay">
          <span class="track__message">{{ overlay }}</span>
        </p>
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

.track {
  position: relative;
  display: grid;
  flex: 1;
  grid-template-rows: repeat(10, minmax(28px, 1fr));
  min-height: 320px;
  overflow: hidden;
  background:
    repeating-linear-gradient(90deg, transparent 0 46px, rgb(255 255 255 / 0.025) 46px 92px),
    linear-gradient(180deg, var(--color-track-lane), var(--color-track));
  // Leave room on the right for the finish line.
  padding-right: 10px;
}

.carrier {
  --runner-height: 78cqh;
  --runner-width: calc(var(--runner-height) * 72 / 44);

  position: absolute;
  top: 11cqh;
  bottom: 11cqh;
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
  border-left: 1px solid rgb(255 255 255 / 0.18);
}

.track__marker-label {
  position: absolute;
  top: 2px;
  left: 4px;
  color: rgb(255 255 255 / 0.75);
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

.track__message {
  max-width: 36ch;
  padding: var(--space-3) var(--space-5);
  border: 1px solid rgb(255 255 255 / 0.25);
  border-radius: var(--radius-pill);
  background: rgb(6 10 22 / 0.72);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-align: center;
  backdrop-filter: blur(6px);
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
