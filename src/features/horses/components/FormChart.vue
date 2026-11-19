<script setup lang="ts">
import { computed } from 'vue'
import { HORSES_PER_ROUND, ROUND_COUNT } from '@/domain/constants'

/**
 * X12 — finishing position per round, as a small line chart. One series, so no legend; the
 * caption names it. Position 1 is at the top. Every point has a hover title, and the form string
 * next to the chart ("1-3-5") is the text equivalent.
 */
const props = defineProps<{
  points: readonly { roundIndex: number; position: number; title: string }[]
  caption: string
}>()

const W = 280
const H = 132
const PAD = { top: 12, right: 16, bottom: 22, left: 24 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const x = (roundIndex: number) => PAD.left + (roundIndex / (ROUND_COUNT - 1)) * plotW
const y = (position: number) => PAD.top + ((position - 1) / (HORSES_PER_ROUND - 1)) * plotH

const gridPositions = [1, 5, HORSES_PER_ROUND]
const rounds = Array.from({ length: ROUND_COUNT }, (_, index) => index)

const path = computed(() =>
  props.points
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${x(p.roundIndex).toFixed(1)} ${y(p.position).toFixed(1)}`,
    )
    .join(' '),
)
const last = computed(() => props.points.at(-1))
</script>

<template>
  <figure class="form-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption" data-testid="form-chart">
      <g class="form-chart__grid" aria-hidden="true">
        <g v-for="position in gridPositions" :key="position">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="y(position)" :y2="y(position)" />
          <text :x="PAD.left - 8" :y="y(position) + 4" text-anchor="end">{{ position }}</text>
        </g>
        <text v-for="round in rounds" :key="round" :x="x(round)" :y="H - 6" text-anchor="middle">
          R{{ round + 1 }}
        </text>
      </g>
      <path v-if="points.length > 1" class="form-chart__line" :d="path" />
      <circle
        v-for="point in points"
        :key="point.roundIndex"
        class="form-chart__point"
        :cx="x(point.roundIndex)"
        :cy="y(point.position)"
        r="4.5"
        data-testid="form-point"
      >
        <title>{{ point.title }}</title>
      </circle>
      <text
        v-if="last"
        class="form-chart__label"
        :x="x(last.roundIndex) + (last.roundIndex === ROUND_COUNT - 1 ? -8 : 8)"
        :y="y(last.position) - 8"
        :text-anchor="last.roundIndex === ROUND_COUNT - 1 ? 'end' : 'start'"
      >
        {{ last.position }}
      </text>
    </svg>
    <figcaption class="form-chart__caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped lang="scss">
.form-chart svg {
  width: 100%;
  height: auto;
  overflow: visible;
}

.form-chart__grid line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.form-chart__grid text {
  fill: var(--color-text-muted);
  font-size: 10px;
}

.form-chart__line {
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 2;
  stroke-linejoin: round;
}

.form-chart__point {
  fill: var(--color-accent);
  // 2px surface ring keeps overlapping marks separate.
  stroke: var(--color-surface);
  stroke-width: 2;
}

.form-chart__label {
  fill: var(--color-text);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
}

.form-chart__caption {
  margin-top: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
</style>
