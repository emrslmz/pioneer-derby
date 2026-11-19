<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseTabs from '@/shared/ui/BaseTabs.vue'
import { tabId, tabPanelId } from '@/shared/ui/tabs'
import { useBreakpoint } from '@/shared/composables/useBreakpoint'
import MobileTabBar from './MobileTabBar.vue'

/**
 * docs/ARCHITECTURE.md §7
 * - desktop: horse list · track · program + results side by side (like the brief's example)
 * - tablet:  track on top, the three tables in tabs below
 * - mobile:  track on top, tables switched from a bottom tab bar
 */
type Section = 'horses' | 'program' | 'results'

const { t } = useI18n()
const breakpoint = useBreakpoint()
const active = ref<Section>('program')
const group = 'sections'

const tabs = computed(() => [
  { id: 'horses', label: t('tabs.horses'), icon: 'horses' as const },
  { id: 'program', label: t('tabs.program'), icon: 'program' as const },
  { id: 'results', label: t('tabs.results'), icon: 'results' as const },
])

const activeTab = computed({
  get: () => active.value,
  set: (value: string) => (active.value = value as Section),
})
</script>

<template>
  <div v-if="breakpoint === 'desktop'" class="layout layout--desktop" data-layout="desktop">
    <div class="layout__horses"><slot name="horses" /></div>
    <div class="layout__track"><slot name="track" /></div>
    <div class="layout__side">
      <slot name="program" />
      <slot name="results" />
    </div>
  </div>

  <div v-else class="layout layout--stacked" :data-layout="breakpoint">
    <div class="layout__track"><slot name="track" /></div>

    <BaseTabs
      v-if="breakpoint === 'tablet'"
      v-model="activeTab"
      :tabs="tabs"
      :group="group"
      :label="t('panels.sections')"
    />

    <div
      :id="tabPanelId(group, active)"
      class="layout__panel"
      role="tabpanel"
      :aria-labelledby="tabId(group, active)"
    >
      <slot v-if="active === 'horses'" name="horses" />
      <slot v-else-if="active === 'program'" name="program" />
      <slot v-else name="results" />
    </div>

    <MobileTabBar
      v-if="breakpoint === 'mobile'"
      v-model="activeTab"
      :tabs="tabs"
      :group="group"
      :label="t('panels.sections')"
    />
  </div>
</template>

<style scoped lang="scss">
.layout {
  padding: var(--layout-gap);
}

.layout--desktop {
  display: grid;
  grid-template-columns: minmax(320px, 1.05fr) minmax(0, 1.9fr) minmax(500px, 1.75fr);
  gap: var(--layout-gap);
  height: calc(100dvh - var(--header-height));
}

.layout--desktop > * {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.layout--desktop > * > :deep(*) {
  flex: 1;
}

.layout__side {
  display: grid !important;
  grid-template-columns: 1fr 1fr;
  gap: var(--layout-gap);
}

.layout--stacked {
  display: flex;
  flex-direction: column;
  gap: var(--layout-gap);
}

.layout--stacked[data-layout='mobile'] {
  padding-bottom: calc(var(--tabbar-height) + var(--layout-gap) + env(safe-area-inset-bottom));
}

.layout__panel {
  min-height: 320px;
}

.layout__panel > :deep(*) {
  height: 100%;
}
</style>
