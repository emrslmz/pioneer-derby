<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import { injectTrackPainter } from '../composables/useTrackPainter'
import type { TrackLane } from '../composables/useDisplayedRound'
import type { Tick } from '../composables/useTrackGeometry'
import TrackMarkers from './TrackMarkers.vue'
import TrackTurf from './TrackTurf.vue'

/**
 * R6 — the picture: ten numbered lanes over turf and rails, with a world drawn in metres (ticks,
 * poles, starting stalls, the finish line) and a horse in every lane. The camera and the horses
 * are moved by the track painter, a frame at a time, without going through Vue.
 */
defineProps<{
  lanes: readonly TrackLane[]
  ticks: readonly Tick[]
  worldStyle: Record<string, string>
  turfStyle: Record<string, string>
  galloping: boolean
  /** The true-scale follow camera (the whole track is still, in "Whole track" and reduced motion). */
  following: boolean
  reducedMotion: boolean
  speed: number
  lap: string
  winnerLane: number | null
}>()

const { t } = useI18n()
const painter = injectTrackPainter()

/** The element the camera window is measured on (the parent derives the geometry from it). */
const viewport = ref<HTMLElement | null>(null)
defineExpose({ viewport })
</script>

<template>
  <div
    class="track"
    :class="{ 'track--running': galloping, 'track--follow': following }"
    role="img"
    :aria-label="t('track.label', { lap: lap || t('round.none'), count: HORSES_PER_ROUND })"
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
      <TrackTurf :style="turfStyle" />
      <!-- The world is drawn in metres; the camera moves it, the horses move in it. -->
      <div
        :ref="painter.setWorld"
        class="track__world"
        :style="worldStyle"
        data-testid="track-world"
      >
        <TrackMarkers :ticks="ticks" />

        <template v-for="{ lane, profile, horse } in lanes" :key="lane">
          <div
            v-if="profile && horse"
            :ref="(element) => painter.setCarrier(profile.lane, element)"
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
          :ref="(element) => painter.setBehindLabel(profile.lane, element)"
          class="track__behind"
          :style="{ '--lane': lane - 1 }"
          data-testid="behind-gap"
          hidden
        />
      </template>
      <span v-if="winnerLane" class="track__winner-lane" :style="{ '--lane': winnerLane - 1 }" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.track {
  --rail: 10px;
  --lane-h: calc((100% - 2 * var(--rail)) / 10);

  display: grid;
  flex: 1;
  grid-template-columns: 2rem 1fr;
  // Short laptop screens (720 px) still fit the whole middle column without scrolling.
  min-height: 220px;
  background: var(--track-bg);
}

.track__numbers {
  display: grid;
  grid-template-rows: repeat(10, 1fr);
  padding-block: var(--rail);
  border-right: 3px solid var(--track-chalk);
  background: var(--track-bg);
}

.track__number {
  display: grid;
  place-items: center;
  border-bottom: 1px solid var(--track-number-line);
  color: var(--track-white);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;

  &:last-child {
    border-bottom: 0;
  }
}

.track__number--winner {
  background: var(--color-gold);
  color: var(--track-ink);
}

.track__viewport {
  position: relative;
  min-width: 0;
  // clip, not hidden: a clipped box can never be scrolled, not even by focus or script.
  overflow: hidden;
  overflow: clip;
}

// The world: everything placed in metres. Its transform is the camera. No background: a huge
// layer of transparent tiles costs nothing to move.
.track__world {
  position: absolute;
  inset: 0 auto 0 0;
  transform: translate3d(0, 0, 0);
}

.track--follow .track__world {
  will-change: transform;
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
  background: var(--track-gap-bg);
  color: var(--track-white);
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
  background: linear-gradient(90deg, transparent, var(--track-winner));
  box-shadow: inset 0 0 0 2px var(--color-gold);
  pointer-events: none;
}
</style>
