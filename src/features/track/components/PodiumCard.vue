<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PODIUM_SIZE } from '@/domain/constants'
import type { RoundResult } from '@/domain/types'
import { useLocale } from '@/i18n/useLocale'
import { useHorsesStore } from '@/stores/horses.store'

/** X13 — the top three of the round that just finished, shown on the track between rounds. */
const props = defineProps<{ result: RoundResult; photoFinish: boolean; next: string }>()

const { t } = useI18n()
const { lapLabel, raceTime } = useLocale()
const horsesStore = useHorsesStore()

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

// Classic podium order on screen: 2nd · 1st · 3rd.
const steps = computed(() =>
  [1, 0, 2].flatMap((index) => (podium.value[index] ? [podium.value[index]] : [])),
)
</script>

<template>
  <section
    class="podium"
    :aria-label="t('broadcast.result', { lap: lapLabel(result.roundIndex, result.distance) })"
    data-testid="podium"
  >
    <header class="podium__header">
      <h3 class="podium__title">
        {{ t('broadcast.result', { lap: lapLabel(result.roundIndex, result.distance) }) }}
      </h3>
      <span v-if="photoFinish" class="podium__photo" data-testid="photo-finish">
        {{ t('broadcast.photoFinish') }} · {{ t('broadcast.margin', { time: margin }) }}
      </span>
    </header>
    <ol class="podium__steps">
      <li
        v-for="step in steps"
        :key="step.horseId"
        class="podium__step"
        :class="`podium__step--${step.position}`"
        :value="step.position"
      >
        <span class="podium__coat" :style="{ '--coat': step.horse.color.hex }" aria-hidden="true">{{
          step.horse.id
        }}</span>
        <span class="podium__name">{{ step.horse.name }}</span>
        <span class="podium__block" aria-hidden="true">{{ step.position }}</span>
      </li>
    </ol>
    <p v-if="next" class="podium__next">{{ next }}</p>
  </section>
</template>

<style scoped lang="scss">
.podium {
  display: grid;
  gap: var(--space-2);
  width: min(360px, 100%);
  padding: var(--space-3) var(--space-4);
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: var(--radius-lg);
  background: rgb(6 10 22 / 0.82);
  color: #fff;
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.45);
  animation: rise var(--duration-base) var(--easing-standard);
}

.podium__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.podium__title {
  font-size: var(--font-size-md);
  letter-spacing: 0.03em;
}

.podium__photo {
  padding: 1px var(--space-2);
  border-radius: var(--radius-pill);
  background: #fff;
  color: #111;
  font-family: var(--font-display);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.podium__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: end;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.podium__step {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  min-width: 0;
  text-align: center;
}

.podium__coat {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 2px solid rgb(0 0 0 / 0.4);
  border-radius: 50%;
  background: var(--coat);
  font-family: var(--font-display);
  font-weight: 700;
  text-shadow:
    0 0 2px #000,
    0 0 2px #000;
}

.podium__name {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium__block {
  display: grid;
  place-items: center;
  width: 100%;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  color: #1a1a1a;
  font-family: var(--font-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.podium__step--1 .podium__block {
  height: 46px;
  background: var(--color-gold);
}

.podium__step--2 .podium__block {
  height: 34px;
  background: var(--color-silver);
}

.podium__step--3 .podium__block {
  height: 26px;
  background: var(--color-bronze);
}

.podium__next {
  color: rgb(255 255 255 / 0.85);
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  font-weight: 600;
  text-align: center;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
