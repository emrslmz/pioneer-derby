<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { HORSES_PER_ROUND } from '@/domain/constants'
import type { HorseId } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import BaseBadge from '@/shared/ui/BaseBadge.vue'
import BaseButton from '@/shared/ui/BaseButton.vue'
import BaseIcon from '@/shared/ui/BaseIcon.vue'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'
import { useRaceStore } from '@/stores/race.store'
import { useScheduleStore } from '@/stores/schedule.store'
import RunnerPicker from './RunnerPicker.vue'

/**
 * X4 — the engagement layer: pick a winner before each round, see a recommended horse with the
 * reasons behind it, and collect points. Points only — no odds, no money (A8).
 */
const { t, locale } = useI18n()
const { lapLabel, ordinal } = useLocale()
const prediction = usePredictionStore()
const { isOpen, recommendation, currentPick, predictions, totalPoints, correctWinners } =
  storeToRefs(prediction)
const race = useRaceStore()
const { status, currentRound } = storeToRefs(race)
const { roundCount } = storeToRefs(useScheduleStore())
const horsesStore = useHorsesStore()

const lap = computed(() =>
  currentRound.value ? lapLabel(currentRound.value.index, currentRound.value.distance) : '',
)

const runners = computed(() =>
  (currentRound.value?.horseIds ?? []).flatMap((id) => horsesStore.getHorse(id) ?? []),
)

const nameOf = (id: HorseId | null | undefined) =>
  (id != null && horsesStore.getHorse(id)?.name) || ''

const recommendationText = computed(() => {
  const tip = recommendation.value
  if (!tip) return ''
  const reasons = new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(
    tip.reasons.map((code) => t(`prediction.reasons.${code}`)),
  )
  return t('prediction.recommendation', { name: nameOf(tip.horseId), reasons })
})

const pick = computed({
  get: () => currentPick.value,
  set: (horseId: HorseId | null) => {
    if (horseId !== null) prediction.pick(horseId)
  },
})

/** Feedback for the most recently scored round. */
const lastOutcome = computed(() => {
  const latest = [...predictions.value].reverse().find((p) => p.score !== null)
  if (!latest?.score) return null
  const round = useScheduleStore().rounds[latest.roundIndex]
  return {
    outcome: latest.score.outcome,
    text: t(`prediction.outcome.${latest.score.outcome}`, {
      lap: round ? lapLabel(round.index, round.distance) : '',
      name: nameOf(latest.horseId),
      ordinal: ordinal(latest.score.position ?? 0),
      points: latest.score.points,
    }),
  }
})

const outcomeTone = { winner: 'success', podium: 'info', miss: 'neutral' } as const

type Mode = 'idle' | 'open' | 'locked' | 'finished'
const mode = computed<Mode>(() => {
  if (status.value === 'idle') return 'idle'
  if (status.value === 'finished') return 'finished'
  return isOpen.value ? 'open' : 'locked'
})

const headline = computed(() => {
  switch (mode.value) {
    case 'idle':
      return t('prediction.idleTitle')
    case 'open':
      return t('prediction.question', { lap: lap.value })
    case 'locked':
      return t('prediction.lockedTitle', { lap: lap.value })
    default:
      return t('prediction.finishedTitle')
  }
})

const tipText = computed(() => {
  if (mode.value === 'idle') return t('prediction.idle')
  if (mode.value === 'finished')
    return t('prediction.final', {
      points: totalPoints.value,
      correct: correctWinners.value,
      rounds: roundCount.value,
    })
  return recommendationText.value
})

const tipTestId = computed(
  () =>
    ({
      idle: 'prediction-idle',
      open: 'recommendation',
      locked: 'prediction-locked',
      finished: 'prediction-final',
    })[mode.value],
)

const canBackTip = computed(
  () =>
    isOpen.value && !!recommendation.value && currentPick.value !== recommendation.value.horseId,
)
</script>

<template>
  <!--
    A compact strip with three fixed rows (title · runners · one info line), the same height in
    every state. Row two holds two layers in one grid cell: the "how to play" steps before a
    program exists, the runner chips afterwards.
  -->
  <section
    class="prediction"
    :class="{ 'prediction--waiting': isOpen && currentPick === null }"
    aria-labelledby="prediction-title"
    data-testid="prediction-card"
  >
    <header class="prediction__header">
      <span class="prediction__badge" aria-hidden="true"><BaseIcon name="star" :size="14" /></span>
      <h2 id="prediction-title" class="prediction__title">{{ t('prediction.title') }}</h2>
      <p class="prediction__question">{{ headline }}</p>
      <span
        class="prediction__score"
        :aria-label="t('prediction.score', { points: totalPoints, correct: correctWinners })"
        data-testid="prediction-score"
      >
        {{ t('prediction.points', { points: totalPoints }) }}
      </span>
    </header>

    <div class="prediction__stage">
      <div
        class="prediction__layer prediction__guide"
        :class="{ 'is-hidden': mode !== 'idle' }"
        :inert="mode !== 'idle' || undefined"
        data-testid="onboarding"
      >
        <!-- The guided tour explains the steps; here one line is enough. -->
        <p class="guide__text">{{ t('prediction.idle') }}</p>
      </div>

      <div
        class="prediction__layer prediction__game"
        :class="{ 'is-hidden': mode === 'idle' }"
        :inert="mode === 'idle' || undefined"
      >
        <RunnerPicker
          v-model="pick"
          :runners="runners"
          :slots="HORSES_PER_ROUND"
          :disabled="!isOpen"
          :label="t('prediction.pickLabel', { lap })"
          :recommended-id="isOpen ? (recommendation?.horseId ?? null) : null"
          :recommended-label="t('prediction.recommended')"
        />
      </div>
    </div>

    <div class="prediction__info">
      <p class="prediction__outcome" aria-live="polite" data-testid="prediction-outcome">
        <BaseBadge v-if="lastOutcome" :tone="outcomeTone[lastOutcome.outcome]">
          {{ lastOutcome.text }}
        </BaseBadge>
      </p>
      <p class="prediction__text" :data-testid="tipTestId">
        <template v-if="mode === 'locked'">
          <strong>{{
            currentPick !== null
              ? t('prediction.yourPick', { name: nameOf(currentPick) })
              : t('prediction.noPick')
          }}</strong>
          <span class="prediction__muted">
            {{ currentPick !== null ? t('prediction.pending') : t('prediction.locked') }}
          </span>
        </template>
        <template v-else-if="mode === 'idle'">{{ t('prediction.rules') }}</template>
        <template v-else>{{ tipText }}</template>
      </p>
      <BaseButton
        size="sm"
        icon="star"
        class="prediction__tip-button"
        :class="{ 'is-hidden': !canBackTip }"
        :disabled="!canBackTip"
        :aria-hidden="!canBackTip"
        :tabindex="canBackTip ? undefined : -1"
        data-testid="pick-tip-button"
        @click="recommendation && (pick = recommendation.horseId)"
      >
        {{ t('prediction.pickTip') }}
      </BaseButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.prediction {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-2) var(--space-4) var(--space-2);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-gold) 16%, var(--color-surface)),
        var(--color-surface) 55%
      )
      padding-box,
    linear-gradient(120deg, var(--color-gold), var(--color-accent)) border-box;
  box-shadow: var(--shadow-panel);
}

// Draw attention while a pick is still possible and none was made.
.prediction--waiting {
  animation: invite 2.4s ease-in-out infinite;
}

@keyframes invite {
  50% {
    box-shadow:
      var(--shadow-panel),
      0 0 0 4px color-mix(in srgb, var(--color-gold) 35%, transparent);
  }
}

.prediction__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.prediction__badge {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-gold);
  color: #1a1a1a;
}

.prediction__title {
  flex-shrink: 0;
  font-size: var(--font-size-md);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.prediction__question {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;

  &::before {
    margin-right: var(--space-2);
    content: '·';
  }
}

.prediction__score {
  flex-shrink: 0;
  margin-left: auto;
  padding: 2px var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--gradient-accent);
  color: var(--color-accent-contrast);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.prediction__stage {
  display: grid;
}

// Both layers occupy the same cell; the hidden one still reserves its height.
.prediction__layer {
  display: flex;
  flex-wrap: nowrap;
  min-height: 44px;
  grid-area: 1 / 1;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
}

.guide__text {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.prediction__tip-button {
  flex-shrink: 0;
  margin-left: auto;
  min-height: 26px;
}

.prediction__info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 1.9rem;
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-sm);
}

.prediction__outcome {
  flex-shrink: 0;

  &:empty {
    display: none;
  }
}

.prediction__text {
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;

  strong {
    color: var(--color-text);
  }
}

.prediction__muted {
  margin-left: var(--space-2);
}

.is-hidden {
  visibility: hidden;
}
</style>
