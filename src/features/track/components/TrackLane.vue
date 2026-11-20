<script setup lang="ts">
/**
 * One lane: number on the left, a run area with the horse. The runner sits inside a "carrier"
 * whose width is the run length, so `translateX(progress × 100%)` moves the horse exactly from
 * the start to the finish line — no layout reads, no `left` animation.
 */
defineProps<{ lane: number; laneLabel: string; winner?: boolean }>()

defineSlots<{ default(): unknown }>()
</script>

<template>
  <div class="lane" :class="{ 'lane--winner': winner }" data-testid="track-lane">
    <span class="lane__number" :aria-label="laneLabel">{{ lane }}</span>
    <div class="lane__run">
      <!-- Starting stall: the horse begins inside it and runs out of the front gate. -->
      <span class="lane__stall" aria-hidden="true" />
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.lane {
  display: grid;
  grid-template-columns: 2rem 1fr;
  min-height: 32px;
  border-bottom: 1px dashed rgb(255 255 255 / 0.28);

  &:last-child {
    border-bottom: 0;
  }
}

.lane--winner {
  background: linear-gradient(90deg, transparent, rgb(245 197 24 / 0.32));
  box-shadow: inset 0 0 0 2px var(--color-gold);
  animation: winner-glow 1.2s ease-in-out 3 alternate;

  .lane__number {
    background: var(--color-gold);
    color: #1a1a1a;
  }
}

@keyframes winner-glow {
  to {
    background-color: rgb(245 197 24 / 0.25);
  }
}

.lane__number {
  display: grid;
  place-items: center;
  // The white start line runs along the edge of the lane numbers.
  border-right: 3px solid #f2f2f2;
  background: #0f3a22;
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.lane__run {
  position: relative;
  overflow: hidden;
  container-type: size;
}

.lane__stall {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  // As wide as the runner (see RaceTrack .carrier) plus the front gate.
  width: calc(94cqh * 72 / 46 + 6px);
  border-right: 4px solid #d6dbe3;
  background:
    linear-gradient(90deg, rgb(255 255 255 / 0.08) 1px, transparent 1px) 0 0 / 8px 100%,
    linear-gradient(180deg, rgb(10 14 22 / 0.55), rgb(30 36 48 / 0.35));
  box-shadow:
    inset 0 2px 0 #9aa3b2,
    inset 0 -2px 0 #9aa3b2,
    2px 0 4px rgb(0 0 0 / 0.35);
}
</style>
