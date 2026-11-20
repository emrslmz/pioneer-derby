<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { RaceSpeed } from '@/domain/types'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseSegmentedControl from '@/shared/ui/BaseSegmentedControl.vue'
import BaseSwitch from '@/shared/ui/BaseSwitch.vue'
import type { IconName } from '@/shared/ui/icons'

/** Everything that controls playback, in one place under the picture: play, speed, auto next. */
defineProps<{
  play: { icon: IconName; label: string }
  canToggle: boolean
  speed: RaceSpeed
  speedOptions: { value: RaceSpeed; label: string }[]
  autoAdvance: boolean
}>()
defineEmits<{
  toggle: []
  'update:speed': [speed: RaceSpeed]
  'update:autoAdvance': [enabled: boolean]
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Player bar: everything that controls playback, in one place under the picture. -->
  <div
    class="player"
    role="group"
    :aria-label="t('track.controls')"
    data-tour="player"
    data-testid="player"
  >
    <BaseButton
      variant="primary"
      size="sm"
      :icon="play.icon"
      icon-only
      :aria-label="play.label"
      :title="play.label"
      :disabled="!canToggle"
      data-testid="player-toggle"
      @click="$emit('toggle')"
    />
    <BaseSegmentedControl
      :model-value="speed"
      class="player__speed"
      :options="speedOptions"
      :label="t('speed.label')"
      size="sm"
      data-testid="player-speed"
      @update:model-value="$emit('update:speed', $event)"
    />
    <BaseSwitch
      :model-value="autoAdvance"
      :label="t('actions.autoAdvance')"
      :hint="t('actions.autoAdvanceHint')"
      data-testid="auto-advance"
      @update:model-value="$emit('update:autoAdvance', $event)"
    />
  </div>
</template>

<style scoped lang="scss">
// Play, speed, auto next round.
.player {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}
</style>
