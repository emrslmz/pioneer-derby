<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Horse, HorseId } from '@/domain/types'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseTooltip from '@/shared/ui/BaseTooltip.vue'

/**
 * The folded horse list: a slim rail with every horse as a small horse in its own colour and its
 * number on the saddle cloth. Hover or focus shows the name and condition; a click opens the
 * statistics. Horses in the current round are ringed, so the rail still says who is racing.
 */
const props = defineProps<{ horses: readonly Horse[]; lanes: ReadonlyMap<HorseId, number> }>()
defineEmits<{ expand: []; select: [horse: Horse] }>()

const { t } = useI18n()
const sorted = computed(() => [...props.horses].sort((a, b) => a.id - b.id))

const label = (horse: Horse) =>
  t('horses.railLabel', {
    name: horse.name,
    condition: horse.condition,
    color: t(`colors.${horse.color.key}`),
  })
</script>

<template>
  <section class="rail" :aria-label="t('horses.railTitle')" data-testid="horses-rail">
    <BaseButton
      variant="ghost"
      size="sm"
      icon="panelOpen"
      icon-only
      class="rail__expand"
      :aria-label="t('horses.expand')"
      :title="t('horses.expand')"
      aria-expanded="false"
      data-testid="horses-expand"
      @click="$emit('expand')"
    />
    <ul class="rail__list" tabindex="0" :aria-label="t('horses.railTitle')">
      <li v-for="horse in sorted" :key="horse.id">
        <BaseTooltip :text="`${horse.name} · ${horse.condition}`" side="right">
          <button
            type="button"
            class="rail__horse"
            :class="{ 'rail__horse--racing': lanes.has(horse.id) }"
            :aria-label="label(horse)"
            data-testid="rail-horse"
            :data-horse-id="horse.id"
            @click="$emit('select', horse)"
          >
            <HorseRunner :color="horse.color.hex" :number="horse.id" :galloping="false" />
            <span v-if="lanes.has(horse.id)" class="rail__lane" aria-hidden="true">
              {{ lanes.get(horse.id) }}
            </span>
          </button>
        </BaseTooltip>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--color-gold);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-panel);
}

.rail__expand {
  flex-shrink: 0;
  margin-block: var(--space-2);
}

.rail__list {
  display: grid;
  flex: 1;
  gap: var(--space-1);
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: var(--space-1) var(--space-2) var(--space-2);
  overflow-y: auto;
  align-content: start;
  list-style: none;
  scrollbar-width: none;
}

.rail__horse {
  position: relative;
  display: grid;
  place-items: center;
  // A fixed size: the horses must not grow or shrink with the rail's width.
  width: 52px;
  height: 34px;
  margin-inline: auto;
  padding: 2px 4px;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-text) 5%, var(--color-surface));
  cursor: pointer;
  transition:
    transform var(--duration-fast),
    border-color var(--duration-fast);

  :deep(.runner) {
    width: 100%;
    height: 100%;
  }

  &:hover {
    transform: translateX(2px);
  }
}

.rail__horse--racing {
  border-color: var(--color-accent);
}

.rail__lane {
  position: absolute;
  top: -5px;
  right: -3px;
  min-width: 16px;
  padding: 0 3px;
  border-radius: var(--radius-pill);
  background: var(--color-accent-strong);
  color: #fff;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}
</style>
