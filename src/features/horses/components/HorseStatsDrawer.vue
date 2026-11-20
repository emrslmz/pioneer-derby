<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { computeHorseStats } from '@/domain/stats'
import type { HorseId } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseColorSwatch from '@/shared/ui/BaseColorSwatch.vue'
import BaseDialog from '@/shared/ui/BaseDialog.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import ConditionBar from './ConditionBar.vue'
import FormChart from './FormChart.vue'

/** X12 — one horse at a glance: condition, colour, rounds run, wins, podiums, average and form. */
const props = defineProps<{ horseId: HorseId | null }>()
const open = defineModel<boolean>('open', { required: true })

const { t } = useI18n()
const { lapLabel, ordinal } = useLocale()
const horsesStore = useHorsesStore()
const { completedResults } = storeToRefs(useRaceStore())
const { rounds } = storeToRefs(useScheduleStore())

const horse = computed(() =>
  props.horseId === null ? undefined : horsesStore.getHorse(props.horseId),
)

const stats = computed(() =>
  props.horseId === null
    ? undefined
    : computeHorseStats([props.horseId], completedResults.value).get(props.horseId),
)

const points = computed(() =>
  completedResults.value.flatMap((result) => {
    const placing = result.placings.find((p) => p.horseId === props.horseId)
    if (!placing) return []
    const round = rounds.value[result.roundIndex]
    return [
      {
        roundIndex: result.roundIndex,
        position: placing.position,
        title: t('stats.formPoint', {
          lap: round ? lapLabel(round.index, round.distance) : '',
          ordinal: ordinal(placing.position),
        }),
      },
    ]
  }),
)

const tiles = computed(() => {
  const s = stats.value
  return [
    { key: 'roundsRun', value: s?.roundsRun ?? 0 },
    { key: 'wins', value: s?.wins ?? 0 },
    { key: 'podiums', value: s?.podiums ?? 0 },
    {
      key: 'average',
      value: s?.averagePosition == null ? t('stats.none') : s.averagePosition.toFixed(1),
    },
  ]
})

/** Racing-form notation: positions in round order, e.g. "1-3-5". */
const formString = computed(() => stats.value?.form.join('-') ?? '')
</script>

<template>
  <BaseDialog
    v-model:open="open"
    placement="end"
    :title="horse ? t('stats.title', { name: horse.name }) : ''"
    :close-label="t('actions.close')"
  >
    <div v-if="horse" class="stats" data-testid="horse-stats">
      <div class="stats__identity">
        <span class="stats__number">{{ t('stats.number', { number: horse.id }) }}</span>
        <BaseColorSwatch
          :hex="horse.color.hex"
          :label="t(`colors.${horse.color.key}`)"
          :horse-number="horse.id"
        />
      </div>

      <div class="stats__condition">
        <span class="stats__label">{{ t('stats.condition') }}</span>
        <ConditionBar :value="horse.condition" />
      </div>

      <dl class="stats__tiles">
        <div v-for="tile in tiles" :key="tile.key" class="stats__tile">
          <dt>{{ t(`stats.${tile.key}`) }}</dt>
          <dd :data-testid="`stat-${tile.key}`">{{ tile.value }}</dd>
        </div>
      </dl>

      <section class="stats__form" aria-labelledby="stats-form-title">
        <h3 id="stats-form-title" class="stats__label">
          {{ t('stats.form') }}
          <span v-if="formString" class="stats__form-string" data-testid="form-string">{{
            formString
          }}</span>
        </h3>
        <FormChart v-if="points.length > 0" :points="points" :caption="t('stats.formCaption')" />
        <p v-else class="stats__empty">{{ t('stats.noForm') }}</p>
      </section>
    </div>
  </BaseDialog>
</template>

<style scoped lang="scss">
.stats {
  display: grid;
  gap: var(--space-5);
}

.stats__identity {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.stats__number {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--color-surface-raised);
  font-family: var(--font-display);
  font-weight: 700;
}

.stats__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.stats__tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.stats__tile {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);

  dt {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  dd {
    font-family: var(--font-display);
    font-size: var(--font-size-xl);
    font-weight: 700;
    line-height: 1.1;
  }
}

.stats__form-string {
  color: var(--color-text);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: none;
}

.stats__empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
