<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import type { SpeedProfile } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useReducedMotion } from '@/shared/composables/useMediaQuery'
import BasePanel from '@/shared/ui/BasePanel.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useRaceLoop } from '../composables/useRaceLoop'
import FinishLine from './FinishLine.vue'
import HorseRunner from './HorseRunner.vue'
import TrackLane from './TrackLane.vue'

/** R6 — ten lanes, coloured runners moving by transform, finish line, lap caption below. */
const { t } = useI18n()
const { lapLabel, distance } = useLocale()
const race = useRaceStore()
const { status, currentRace, currentRound, speed } = storeToRefs(race)
const horsesStore = useHorsesStore()
const reducedMotion = useReducedMotion()

const lap = computed(() =>
  currentRound.value ? lapLabel(currentRound.value.index, currentRound.value.distance) : '',
)

const lanes = computed(() =>
  Array.from({ length: HORSES_PER_ROUND }, (_, index) => {
    const profile = currentRace.value?.profiles[index]
    const horse = profile ? horsesStore.getHorse(profile.horseId) : undefined
    return { lane: index + 1, profile, horse }
  }),
)

/** Every 200 m, like furlong poles. */
const markers = computed(() => {
  const metres = currentRound.value?.distance ?? 0
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
    case 'intermission':
      return t('track.intermission', { lap: lap.value })
    case 'finished':
      return t('track.finished')
    default:
      return ''
  }
})

const galloping = computed(() => status.value === 'running')

// Per-frame painting writes straight to the carriers' style (X10).
const carriers = new Map<number, HTMLElement>()
function setCarrier(lane: number, element: unknown) {
  if (element instanceof HTMLElement) carriers.set(lane, element)
  else carriers.delete(lane)
}

useRaceLoop((profile: SpeedProfile, progress: number) => {
  const carrier = carriers.get(profile.lane)
  if (carrier) carrier.style.transform = `translate3d(${(progress * 100).toFixed(3)}%, 0, 0)`
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

        <p v-if="overlay" class="track__overlay" data-testid="track-overlay">
          <span>{{ overlay }}</span>
        </p>
      </div>
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

  span {
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
