<script setup lang="ts">
import BaseTabs from '@/shared/ui/BaseTabs.vue'
import type { IconName } from '@/shared/ui/icons'
import type { TabItem } from '@/shared/ui/tabs'

/** Thumb-reachable section switcher pinned to the bottom of small screens. */
defineProps<{ tabs: readonly (TabItem & { icon: IconName })[]; group: string; label: string }>()

const active = defineModel<string>({ required: true })
</script>

<template>
  <nav class="tabbar" :aria-label="label">
    <BaseTabs v-model="active" :tabs="tabs" :group="group" :label="label" variant="bar" />
  </nav>
</template>

<style scoped lang="scss">
.tabbar {
  position: fixed;
  inset: auto 0 0;
  z-index: var(--z-tabbar);
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-glass);
  backdrop-filter: blur(14px) saturate(140%);
}
</style>
