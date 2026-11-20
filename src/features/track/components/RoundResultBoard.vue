<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { INTERMISSION_MS, PODIUM_SIZE } from '@/domain/constants'
import type { RoundResult } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useHorsesStore } from '@/stores/horses.store'
import { usePredictionStore } from '@/stores/prediction.store'

/**
 * X13 — the result of the round that just finished, shown on the track between rounds: the podium
 * as clear rows, the photo-finish margin, how the viewer's prediction did, and a countdown to the
 * next round. Opaque, so it reads on any track size and theme.
 */
const props = defineProps<{ result: RoundResult; photoFinish: boolean; finished: boolean }>()

const { t } = useI18n()
const { lapLabel, raceTime, ordinal } = useLocale()
const horsesStore = useHorsesStore()
const { predictions, totalPoints } = storeToRefs(usePredictionStore())

const lap = computed(() => lapLabel(props.result.roundIndex, props.result.distance))

const podium = computed(() =>
  props.result.placings.slice(0, PODIUM_SIZE).flatMap((placing) => {
    const horse = horsesStore.getHorse(placing.horseId)
    return horse ? [{ ...placing, horse }] : []
  }),
)

const margin = computed(() => {
  const [first, second] = props.result.placings
  return first && second ? raceTime(second.timeMs - first.timeMs) : ''
})

const pick = computed(() => {
  const prediction = predictions.value.find((p) => p.roundIndex === props.result.roundIndex)
  const score = prediction?.score
  if (!score) return null
  return {
    outcome: score.outcome,
    text: t(`result.pick.${score.outcome}`, {
      points: score.points,
      ordinal: ordinal(score.position ?? 0),
    }),
  }
})
</script>

<template>
  <section class="board" :aria-label="t('result.eyebrow', { lap })" data-testid="round-result">
    <header class="board__header">
      <p class="board__eyebrow">{{ t('result.eyebrow', { lap }) }}</p>
      <span v-if="photoFinish" class="board__photo" data-testid="photo-finish">
        {{ t('broadcast.photoFinish') }} · {{ t('broadcast.margin', { time: margin }) }}
      </span>
    </header>

    <ol class="board__podium">
      <li
        v-for="row in podium"
        :key="row.horseId"
        class="board__row"
        :class="`board__row--${row.position}`"
        data-testid="result-podium-row"
      >
        <span class="board__medal" aria-hidden="true">{{ row.position }}</span>
        <span class="board__coat" :style="{ '--coat': row.horse.color.hex }" aria-hidden="true">
          {{ row.horse.id }}
        </span>
        <span class="board__name">{{ row.horse.name }}</span>
        <span class="board__time">{{ raceTime(row.timeMs) }}</span>
      </li>
    </ol>

    <p
      v-if="pick"
      class="board__pick"
      :class="`board__pick--${pick.outcome}`"
      data-testid="result-pick"
    >
      {{ pick.text }}
    </p>

    <footer class="board__footer">
      <template v-if="finished">
        <strong>{{ t('result.finished') }}</strong>
        <span>{{ t('result.finalScore', { points: totalPoints }) }}</span>
      </template>
      <template v-else>
        <slot name="next" />
        <span
          class="board__countdown"
          :style="{ '--intermission': `${INTERMISSION_MS}ms` }"
          aria-hidden="true"
        />
      </template>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.board {
  display: grid;
  gap: var(--space-3);
  width: min(420px, 100%);
  max-height: 100%;
  padding: var(--space-4);
  overflow: auto;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
  animation: enter var(--duration-base) var(--easing-standard);
}

.board__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.board__eyebrow {
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
}

.board__photo {
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-text);
  color: var(--color-surface);
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.board__podium {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.board__row {
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: var(--space-2) var(--space-3);
  min-width: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
}

.board__row--1 {
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--color-gold) 22%, var(--color-surface-raised));

  .board__name {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
  }

  // Muted text is too faint on the gold tint; use full-strength text here.
  .board__time {
    color: var(--color-text);
  }

  .board__medal {
    width: 32px;
    height: 32px;
    font-size: var(--font-size-lg);
  }
}

.board__medal {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #1a1a1a;
  font-family: var(--font-display);
  font-weight: 700;
}

.board__row--1 .board__medal {
  background: var(--color-gold);
}

.board__row--2 .board__medal {
  background: var(--color-silver);
}

.board__row--3 .board__medal {
  background: var(--color-bronze);
}

.board__coat {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 2px solid rgb(0 0 0 / 0.35);
  border-radius: 50%;
  background: var(--coat);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000;
}

.board__name {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board__time {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.board__pick {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-weight: 700;
}

.board__pick--winner {
  background: var(--color-success-soft);
  color: var(--color-success-text);
}

.board__pick--podium {
  background: var(--color-info-soft);
  color: var(--color-info-text);
}

.board__pick--miss {
  background: var(--color-row-hover);
  color: var(--color-text-muted);
}

.board__footer {
  display: grid;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 600;
}

// Time left until the next round starts on its own.
.board__countdown {
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  transform-origin: left center;
  animation: countdown var(--intermission) linear forwards;
}

@keyframes countdown {
  to {
    transform: scaleX(0);
  }
}

@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .board__countdown {
    animation: none;
  }
}
</style>
