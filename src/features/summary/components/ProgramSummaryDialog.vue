<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PREDICTION_POINTS } from '@/domain/constants'
import { summarizeProgram } from '@/domain/summary'
import { useLocale } from '@/i18n/useLocale'
import { analytics } from '@/shared/analytics'
import HorseRunner from '@/shared/components/HorseRunner.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseDialog from '@/shared/ui/BaseDialog.vue'
import BaseShortName from '@/shared/ui/BaseShortName.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'
import { useRaceStore } from '@/stores/race.store'
import SummaryChart from './SummaryChart.vue'

/**
 * X13 — the end of a program: the champion, how the player's predictions did, wins and podiums of
 * the best horses as a chart, and the winner of each round. Opens by itself when the last round
 * is over, and again from the Results panel. Read-only: it only reads finished results.
 */
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ source: 'auto' | 'manual' }>()
defineEmits<{ replay: [] }>()

const { t } = useI18n()
const { lapLabel, raceTime } = useLocale()
const horsesStore = useHorsesStore()
const { completedResults } = storeToRefs(useRaceStore())
const prediction = usePredictionStore()

const summary = computed(() =>
  summarizeProgram(
    horsesStore.horses.map((horse) => horse.id),
    completedResults.value,
  ),
)
const champion = computed(() => {
  const stats = summary.value.champion
  const horse = stats ? horsesStore.getHorse(stats.horseId) : undefined
  return stats && horse ? { stats, horse } : null
})
const winners = computed(() =>
  summary.value.roundWinners.flatMap((winner) => {
    const horse = horsesStore.getHorse(winner.horseId)
    return horse ? [{ winner, horse }] : []
  }),
)
watch(open, (isOpen) => {
  if (isOpen) {
    analytics.track('summary_viewed', {
      source: props.source,
      championId: summary.value.champion?.horseId ?? null,
    })
  }
})

const made = computed(() => prediction.predictions.length)
const bestPossible = computed(() => PREDICTION_POINTS.winner * completedResults.value.length)
</script>

<template>
  <BaseDialog
    v-model:open="open"
    size="lg"
    :title="t('summary.title')"
    :close-label="t('actions.close')"
  >
    <div class="summary" data-testid="program-summary">
      <p class="summary__intro">{{ t('summary.intro') }}</p>

      <div class="summary__top">
        <section v-if="champion" class="card card--champion" data-testid="summary-champion">
          <h3 class="card__label">{{ t('summary.champion') }}</h3>
          <HorseRunner
            class="champion__horse"
            :color="champion.horse.color.hex"
            :number="champion.horse.id"
            :galloping="false"
          />
          <p class="champion__name">{{ champion.horse.name }}</p>
          <p class="card__note">
            {{
              t('summary.record', { wins: champion.stats.wins, podiums: champion.stats.podiums })
            }}
          </p>
        </section>

        <section class="card" data-testid="summary-score">
          <h3 class="card__label">{{ t('summary.score') }}</h3>
          <template v-if="made > 0">
            <p class="score__points">
              {{ t('summary.points', { points: prediction.totalPoints }) }}
              <span class="score__of">/ {{ bestPossible }}</span>
            </p>
            <p class="card__note">
              {{ t('summary.called', { winners: prediction.correctWinners, made }) }}
            </p>
          </template>
          <p v-else class="card__note">{{ t('summary.noPicks') }}</p>
        </section>
      </div>

      <section>
        <h3 class="summary__heading">{{ t('summary.chart') }}</h3>
        <SummaryChart :standings="summary.standings" />
      </section>

      <section>
        <h3 class="summary__heading">{{ t('summary.rounds') }}</h3>
        <table class="rounds" data-testid="summary-rounds">
          <thead>
            <tr>
              <th scope="col">{{ t('summary.lap') }}</th>
              <th scope="col">{{ t('summary.winner') }}</th>
              <th scope="col" class="rounds__time">{{ t('summary.time') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ winner, horse } in winners" :key="winner.roundIndex">
              <td>{{ lapLabel(winner.roundIndex, winner.distance) }}</td>
              <td>
                <span class="rounds__winner">
                  <HorseRunner :color="horse.color.hex" :number="horse.id" :galloping="false" />
                  <BaseShortName :name="horse.name" />
                </span>
              </td>
              <td class="rounds__time">{{ raceTime(winner.timeMs) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="summary__actions">
        <BaseButton data-testid="summary-close" @click="open = false">
          {{ t('actions.close') }}
        </BaseButton>
        <BaseButton
          variant="primary"
          icon="replay"
          data-testid="summary-replay"
          @click="$emit('replay')"
        >
          {{ t('actions.replay') }}
        </BaseButton>
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped lang="scss">
.summary {
  display: grid;
  gap: var(--space-5);
}

.summary__intro {
  color: var(--color-text-muted);
}

.summary__top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: var(--space-3);
}

.card {
  display: grid;
  align-content: start;
  justify-items: start;
  gap: var(--space-1);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-sunken);
  // The cards arrive one after the other when the dialog opens.
  animation: card-in 520ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;

  &:nth-child(2) {
    animation-delay: 120ms;
  }
}

.card--champion {
  border-color: var(--color-gold);
  background: color-mix(in srgb, var(--color-gold) 12%, var(--color-surface));
}

.card__label,
.summary__heading {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.card__note {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.champion__horse {
  width: 4.5rem;
  height: auto;
}

.champion__name {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1.1;
}

.score__points {
  font-family: var(--font-display);
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.1;
}

.score__of {
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
}

.summary__heading {
  margin-bottom: var(--space-2);
}

.rounds {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);

  th,
  td {
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--color-border);
    text-align: start;
  }

  thead th {
    color: var(--color-text-muted);
    font-family: var(--font-display);
    font-size: var(--font-size-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
}

.rounds__winner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;

  :deep(.runner) {
    width: 2rem;
    height: auto;
    flex-shrink: 0;
  }
}

.rounds__time {
  font-variant-numeric: tabular-nums;
  text-align: end !important;
  white-space: nowrap;
}

.summary__actions {
  // Stays in view when the dialog scrolls (short screens).
  position: sticky;
  bottom: calc(-1 * var(--space-6));
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-bottom: calc(-1 * var(--space-6));
  padding-block: var(--space-3) var(--space-6);
  background: linear-gradient(transparent, var(--color-surface) 35%);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translate3d(0, 14px, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>
