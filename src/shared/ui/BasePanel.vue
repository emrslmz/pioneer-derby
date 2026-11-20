<script setup lang="ts">
import { useId } from 'vue'
import BaseIcon from './BaseIcon.vue'
import type { IconName } from './icons'

/** A titled card. The heading labels the region, so screen readers can jump between panels. */
withDefaults(
  defineProps<{
    title: string
    tone?: 'neutral' | 'horses' | 'track' | 'program' | 'results'
    icon?: IconName
    /** Lets the body scroll inside the panel instead of growing the page. */
    scroll?: boolean
  }>(),
  { tone: 'neutral' },
)

const headingId = useId()
</script>

<template>
  <section class="panel" :class="`panel--${tone}`" :aria-labelledby="headingId">
    <header class="panel__header">
      <BaseIcon v-if="icon" class="panel__icon" :name="icon" :size="18" />
      <h2 :id="headingId" class="panel__title">{{ title }}</h2>
      <div class="panel__actions"><slot name="actions" /></div>
    </header>
    <!-- A scrollable region must be reachable by keyboard (WCAG 2.1.1); it reads as the panel. -->
    <div
      class="panel__body"
      :class="{ 'panel__body--scroll': scroll }"
      :tabindex="scroll ? 0 : undefined"
      :aria-labelledby="scroll ? headingId : undefined"
      :role="scroll ? 'region' : undefined"
    >
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel {
  --panel-tone: var(--color-border-strong);

  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.panel--horses {
  --panel-tone: var(--color-panel-horses);
}

.panel--track {
  --panel-tone: var(--color-panel-track);
}

.panel--program {
  --panel-tone: var(--color-panel-program);
}

.panel--results {
  --panel-tone: var(--color-panel-results);
}

.panel__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--panel-tone) 16%, transparent),
    transparent 70%
  );

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: var(--panel-tone);
    content: '';
  }
}

.panel__icon {
  color: var(--panel-tone);
}

.panel__title {
  font-size: var(--font-size-lg);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.panel__actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.panel__body {
  // Positioned, so visually-hidden (absolute) descendants such as table captions stay inside the
  // panel and are clipped, instead of stretching the page.
  position: relative;
  flex: 1;
  min-height: 0;
}

.panel__body--scroll {
  overflow: auto;
  overscroll-behavior: contain;
}
</style>
