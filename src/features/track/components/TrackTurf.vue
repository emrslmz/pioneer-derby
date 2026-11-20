<script setup lang="ts">
import { HORSES_PER_ROUND } from '@/domain/constants'
import { injectTrackPainter } from '../composables/useTrackPainter'

/**
 * Turf, rails and lane lines look the same all along the track: a layer one stripe wider than the
 * screen loops under the camera, so a 2 km track at true scale never needs a 50 000 px textured
 * layer. The track painter moves it by less than one stripe period per frame.
 */
const painter = injectTrackPainter()
</script>

<template>
  <div :ref="painter.setTurf" class="track__turf">
    <span class="track__rail track__rail--top" />
    <span class="track__rail track__rail--bottom" />
    <span
      v-for="index in HORSES_PER_ROUND - 1"
      :key="`line-${index}`"
      class="track__lane-line"
      :style="{ '--lane': index }"
    />
  </div>
</template>

<style scoped lang="scss">
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

// White running rails with posts, top and bottom.
.track__rail {
  position: absolute;
  inset-inline: 0;
  z-index: 1;
  height: var(--rail);
  background:
    linear-gradient(var(--track-rail), var(--track-rail)) 0 2px / 100% 3px no-repeat,
    // Posts every half stripe, so the looping turf layer has no seam.
    repeating-linear-gradient(
        90deg,
        var(--track-rail-post) 0 3px,
        transparent 3px calc(var(--stripe) / 2)
      )
      0 0 / 100% 10px;
  filter: drop-shadow(0 1px 1px var(--track-shadow));
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
  border-top: 1px dashed var(--track-lane-line);
}

.track--follow .track__turf {
  will-change: transform;
}
</style>
