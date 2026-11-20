<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PODIUM_SIZE } from '@/domain/constants'
import type { HorseId } from '@/domain/types'
import { shortName } from '@/shared/utils/names'
import { useHorsesStore } from '@/stores/horses.store'

/**
 * X13 — the field in running order. Updated only when the order changes (useBroadcast), so it
 * re-renders a few times per round. Not a live region: the commentary ticker narrates instead.
 */
const props = defineProps<{ standings: readonly HorseId[] }>()

const { t } = useI18n()
const horsesStore = useHorsesStore()

const entries = computed(() =>
  props.standings.flatMap((id, index) => {
    const horse = horsesStore.getHorse(id)
    return horse ? [{ position: index + 1, horse }] : []
  }),
)
</script>

<template>
  <!-- Scrolls horizontally on small screens, so it must be keyboard-focusable (WCAG 2.1.1). -->
  <ol
    class="leaderboard"
    tabindex="0"
    :aria-label="t('broadcast.standings')"
    data-testid="leaderboard"
  >
    <li
      v-for="{ position, horse } in entries"
      :key="horse.id"
      class="leaderboard__entry"
      :class="{ 'leaderboard__entry--podium': position <= PODIUM_SIZE }"
      :aria-label="t('broadcast.position', { position, name: horse.name })"
      data-testid="leaderboard-entry"
      :data-horse-id="horse.id"
    >
      <span class="leaderboard__position" aria-hidden="true">{{ position }}</span>
      <span class="leaderboard__coat" :style="{ '--coat': horse.color.hex }" aria-hidden="true">
        {{ horse.id }}
      </span>
      <span v-if="position <= PODIUM_SIZE" class="leaderboard__name" aria-hidden="true">
        {{ shortName(horse.name) }}
      </span>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.leaderboard {
  display: flex;
  gap: var(--space-1);
  // Reserved before the first standings exist (26 px entries + padding), so Generate and Start
  // never resize the track.
  min-height: calc(26px + 2 * var(--space-2) + 1px);
  margin: 0;
  padding: var(--space-2) var(--space-3);
  overflow-x: auto;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
  list-style: none;
  scrollbar-width: none;
}

.leaderboard__entry {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2) 2px 2px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  font-size: var(--font-size-xs);
}

.leaderboard__entry--podium {
  background: color-mix(in srgb, var(--color-gold) 14%, var(--color-surface-raised));
}

.leaderboard__position {
  min-width: 1.4em;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-weight: 700;
  text-align: center;
}

.leaderboard__coat {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1.5px solid rgb(0 0 0 / 0.35);
  border-radius: 50%;
  background: var(--coat);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000;
}

.leaderboard__name {
  font-weight: 600;
  white-space: nowrap;
}
</style>
