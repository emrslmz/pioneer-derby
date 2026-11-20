<script setup lang="ts">
import { computed } from 'vue'
import { shortName } from '@/shared/utils/names'

/**
 * Shows "Grace H." where space is tight. Hover (title) reveals the full name. Screen readers hear
 * "Grace H. (Grace Hopper)": the visible text stays the start of the accessible name, so voice
 * control users can say what they see (WCAG 2.5.3 Label in Name).
 */
const props = defineProps<{ name: string }>()

const short = computed(() => shortName(props.name))
</script>

<template>
  <span class="short-name" :title="name" data-testid="short-name">
    <span class="short-name__visible">{{ short }}</span>
    <span v-if="short !== name" class="visually-hidden"> ({{ name }})</span>
  </span>
</template>

<style scoped lang="scss">
.short-name {
  position: relative;
  white-space: nowrap;
}
</style>
