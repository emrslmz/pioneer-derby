<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { injectTrackPainter } from '../composables/useTrackPainter'
import type { TrackLane } from '../composables/useDisplayedRound'

/**
 * Race map: the whole distance at a glance, with every horse as a dot and the camera window as a
 * frame. Its first part is the broadcast caption: the round, and the leader's distance to go.
 */
defineProps<{
  lanes: readonly TrackLane[]
  lap: string
  showToGo: boolean
  /** A round is on screen: the window and the dots exist. */
  hasRace: boolean
  /** Metres the camera shows, and metres in the round: the window's share of the map. */
  visible: number
  metres: number
}>()

const { t } = useI18n()
const painter = injectTrackPainter()
</script>

<template>
  <!-- Race map: the whole distance, every horse and the camera window. -->
  <div class="race-map" data-testid="race-map">
    <!-- Broadcast caption: the round, and while it runs the leader's distance to go. -->
    <span class="race-map__info">
      <span v-if="lap" data-testid="track-caption">{{ lap }}</span>
      <span v-if="showToGo" :ref="painter.setToGo" class="race-map__to-go" data-testid="to-go" />
    </span>
    <div class="race-map__run" aria-hidden="true">
      <span
        v-if="hasRace"
        :ref="painter.setMapWindow"
        class="race-map__window"
        :style="{ width: `${(visible / metres) * 100}%` }"
      />
      <template v-for="{ lane, profile, horse } in lanes" :key="`dot-${lane}`">
        <span
          v-if="profile && horse"
          :ref="(element) => painter.setMapDot(profile.lane, element)"
          class="race-map__carrier"
          data-testid="map-dot"
        >
          <span class="race-map__dot" :style="{ '--coat': horse.color.hex }" />
        </span>
      </template>
    </div>
    <span class="race-map__label" aria-hidden="true">{{ t('track.mapFinish') }}</span>
  </div>
</template>

<style scoped lang="scss">
// Race map: the whole distance at a glance.
.race-map {
  // Always laid out: Generate must not push the track around.
  min-height: 29px;
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
  border: 2px solid var(--track-white);
  border-radius: var(--radius-sm);
  background: var(--track-number-line);
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
  border: 1.5px solid var(--track-gap-bg);
  border-radius: 50%;
  background: var(--coat);
  transform: translate(-50%, -50%);
}
</style>
