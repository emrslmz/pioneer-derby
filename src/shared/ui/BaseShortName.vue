<script setup lang="ts">
import { computed } from 'vue'
import { shortName } from '@/shared/utils/names'
import BaseTooltip from './BaseTooltip.vue'

/**
 * Shows "Grace H." where space is tight; a tooltip reveals the full name on hover and focus.
 * Screen readers hear "Grace H. (Grace Hopper)": the visible text stays the start of the accessible
 * name, so voice-control users can say what they see (WCAG 2.5.3 Label in Name).
 */
const props = defineProps<{ name: string }>()

const short = computed(() => shortName(props.name))
</script>

<template>
  <BaseTooltip v-if="short !== name" :text="name">
    <span class="short-name" data-testid="short-name">
      <span class="short-name__visible">{{ short }}</span>
      <span class="visually-hidden"> ({{ name }})</span>
    </span>
  </BaseTooltip>
  <span v-else class="short-name" data-testid="short-name">
    <span class="short-name__visible">{{ name }}</span>
  </span>
</template>

<style scoped lang="scss">
.short-name {
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
