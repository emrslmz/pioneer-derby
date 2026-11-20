<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import type { Tick } from '../composables/useTrackGeometry'

/**
 * Everything placed in metres on the track, apart from the horses: the distance ticks and
 * labelled poles, a starting stall per lane and the chequered finish line. A fragment: it renders
 * inside the world element that the camera moves.
 */
defineProps<{ ticks: readonly Tick[] }>()

const { t } = useI18n()
</script>

<template>
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
    v-for="lane in HORSES_PER_ROUND"
    :key="`stall-${lane}`"
    class="track__stall"
    :style="{ '--lane': lane - 1 }"
  />
  <span class="track__finish">
    <span class="track__finish-label">{{ t('track.finish') }}</span>
  </span>
</template>

<style scoped lang="scss">
.track__tick {
  position: absolute;
  top: var(--rail);
  bottom: var(--rail);
  border-left: 1px dashed var(--track-tick);
}

.track__tick--pole {
  border-left-color: var(--track-tick-pole);
}

// Furlong-style pole on the outer rail.
.track__pole {
  position: absolute;
  top: calc(-1 * var(--rail));
  left: -3px;
  width: 6px;
  height: 18px;
  border-radius: 2px;
  background: repeating-linear-gradient(
    180deg,
    var(--track-pole) 0 4px,
    var(--track-white) 4px 8px
  );
  box-shadow: 0 1px 2px var(--track-shadow);
}

.track__marker-label {
  position: absolute;
  top: 2px;
  left: 6px;
  padding: 0 4px;
  border-radius: var(--radius-sm);
  background: var(--track-label-bg);
  color: var(--track-white);
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
  border-right: 4px solid var(--track-stall-frame);
  background:
    linear-gradient(90deg, var(--track-number-line) 1px, transparent 1px) 0 0 / 8px 100%,
    linear-gradient(180deg, var(--track-stall-top), var(--track-stall-bottom));
  box-shadow:
    inset 0 2px 0 var(--track-stall-edge),
    inset 0 -2px 0 var(--track-stall-edge),
    2px 0 4px var(--track-shadow);
}

.track__finish {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--finish-x);
  z-index: 1;
  width: 10px;
  background:
    repeating-conic-gradient(var(--track-white) 0 25%, var(--track-checker) 0 50%) 0 0 / 10px 10px,
    var(--track-white);
  box-shadow:
    -2px 0 0 var(--color-finish),
    0 0 18px var(--track-finish-glow);
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
</style>
