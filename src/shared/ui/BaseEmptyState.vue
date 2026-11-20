<script setup lang="ts">
/** A panel with nothing in it yet: one plain sentence, and optionally the action that fills it. */
defineProps<{ description: string }>()
</script>

<template>
  <div class="empty">
    <p class="empty__text">{{ description }}</p>
    <div v-if="$slots.default" class="empty__action"><slot /></div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.empty__text {
  max-width: 30ch;
  color: var(--color-text-muted);
  font-size: var(--font-size-md);
}
</style>
