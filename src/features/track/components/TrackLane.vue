<script setup lang="ts">
/**
 * One lane: number on the left, a run area with the horse. The runner sits inside a "carrier"
 * whose width is the run length, so `translateX(progress × 100%)` moves the horse exactly from
 * the start to the finish line — no layout reads, no `left` animation.
 */
defineProps<{ lane: number; laneLabel: string }>()

defineSlots<{ default(): unknown }>()
</script>

<template>
  <div class="lane" data-testid="track-lane">
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
  min-height: 28px;
  border-bottom: 2px dashed var(--color-track-line);

  &:last-child {
    border-bottom: 0;
  }
}

.lane__number {
  display: grid;
  place-items: center;
  border-right: 2px solid rgb(255 255 255 / 0.5);
  background: rgb(0 0 0 / 0.28);
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
