<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="finish" aria-hidden="true">
    <span class="finish__label">{{ label }}</span>
  </div>
</template>

<style scoped lang="scss">
.finish {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 1;
  width: 10px;
  background:
    repeating-conic-gradient(#fff 0 25%, #111 0 50%) 0 0 / 10px 10px,
    #fff;
  box-shadow:
    -2px 0 0 var(--color-finish),
    0 0 18px rgb(255 59 59 / 0.45);
}

.finish__label {
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
