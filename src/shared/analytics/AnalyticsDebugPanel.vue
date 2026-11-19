<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import { analyticsLog, type AnalyticsEvent } from './index'

/**
 * Developer panel (`?debug=1`): the live analytics stream exactly as an SDK adapter would receive
 * it. Shows that every user action is measured through one typed layer (X5).
 */
const { t } = useI18n()
const events = shallowRef<readonly AnalyticsEvent[]>([...analyticsLog.events])
const open = ref(true)

const unsubscribe = analyticsLog.subscribe(() => {
  events.value = [...analyticsLog.events]
})
onBeforeUnmount(unsubscribe)

function clear() {
  analyticsLog.clear()
  events.value = []
}

const time = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, { hour12: false })
</script>

<template>
  <aside class="debug" :aria-label="t('debug.title')" data-testid="debug-panel">
    <button
      type="button"
      class="debug__toggle"
      :aria-expanded="open"
      aria-controls="debug-events"
      :aria-label="t('debug.toggle')"
      @click="open = !open"
    >
      <BaseIcon name="bug" :size="16" />
      {{ t('debug.title') }}
      <span class="debug__count">{{ events.length }}</span>
    </button>
    <div v-show="open" id="debug-events" class="debug__body">
      <button type="button" class="debug__clear" @click="clear">{{ t('debug.clear') }}</button>
      <ol v-if="events.length > 0" class="debug__list" reversed>
        <li
          v-for="(event, index) in [...events].reverse()"
          :key="`${event.timestamp}-${index}`"
          data-testid="debug-event"
        >
          <span class="debug__time">{{ time(event.timestamp) }}</span>
          <code class="debug__name">{{ event.name }}</code>
          <code class="debug__payload">{{ JSON.stringify(event.payload) }}</code>
        </li>
      </ol>
      <p v-else class="debug__empty">{{ t('debug.empty') }}</p>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.debug {
  position: fixed;
  bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
  left: var(--space-4);
  z-index: var(--z-dialog);
  width: min(420px, calc(100vw - 2 * var(--space-4)));
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-raised);
  font-size: var(--font-size-xs);
}

.debug__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 0;
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.debug__count {
  margin-left: auto;
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-accent-text);
}

.debug__body {
  max-height: 260px;
  overflow: auto;
  padding: var(--space-2) var(--space-3);
}

.debug__clear {
  float: right;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  cursor: pointer;
}

.debug__list {
  display: grid;
  gap: var(--space-1);
  padding: 0;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: var(--space-2);
    align-items: baseline;
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--color-border);
  }
}

.debug__time {
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.debug__name {
  color: var(--color-accent-text);
  font-weight: 700;
}

.debug__payload {
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.debug__empty {
  color: var(--color-text-muted);
}
</style>
