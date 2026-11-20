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
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.lane {
  display: grid;
  grid-template-columns: 2rem 1fr;
  min-height: 32px;
  border-bottom: 1px dashed rgb(255 255 255 / 0.45);

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
</style>
