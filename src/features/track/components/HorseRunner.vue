<script setup lang="ts">
/**
 * A side-view racehorse in its own colour with the horse number on the saddle cloth.
 * Purely visual (`aria-hidden`); the track's label and the tables carry the information.
 * The gallop is CSS transform animation on legs and body only.
 */
defineProps<{ color: string; number: number; galloping: boolean }>()
</script>

<template>
  <svg
    class="runner"
    :class="{ 'runner--galloping': galloping }"
    viewBox="0 0 72 44"
    aria-hidden="true"
    focusable="false"
    :style="{ '--coat': color }"
  >
    <g class="runner__body">
      <g class="runner__legs runner__legs--back">
        <path d="M19 25 L13 40" />
        <path d="M24 26 L27 40" />
      </g>
      <g class="runner__legs runner__legs--front">
        <path d="M46 24 L52 39" />
        <path d="M42 26 L38 40" />
      </g>
      <path class="runner__tail" d="M15 17 C7 16 4 25 2 31 C9 28 13 25 16 22 Z" />
      <ellipse class="runner__coat" cx="31" cy="20" rx="17" ry="8" />
      <path class="runner__coat" d="M42 16 L52 6 L58 4 L67 11 L65 15 L57 13 L51 22 Z" />
      <path class="runner__coat" d="M55 5 L56.5 0 L59 5 Z" />
      <rect class="runner__cloth" x="21" y="14" width="13" height="10" rx="2" />
      <text class="runner__number" x="27.5" y="22">{{ number }}</text>
      <g class="runner__jockey">
        <path d="M28 13 L35 4 L39 6 L33 15 Z" />
        <circle cx="38.5" cy="3.6" r="3.2" class="runner__helmet" />
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.runner {
  --gallop: calc(0.42s / var(--race-speed, 1));

  display: block;
  height: 100%;
  overflow: visible;
  // A light halo plus a shadow keeps green or dark coats readable on the green track.
  filter: drop-shadow(0 0 1.5px rgb(255 255 255 / 0.85)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.35));
}

.runner__coat,
.runner__tail {
  fill: var(--coat);
  stroke: rgb(0 0 0 / 0.55);
  stroke-width: 1;
  stroke-linejoin: round;
}

.runner__legs path {
  fill: none;
  stroke: var(--coat);
  stroke-width: 3.6;
  stroke-linecap: round;
}

.runner__legs {
  transform-box: fill-box;
  transform-origin: 50% 0;
}

.runner__cloth {
  fill: #fff;
  stroke: rgb(0 0 0 / 0.35);
  stroke-width: 0.6;
}

.runner__number {
  fill: #111;
  font-family: var(--font-display);
  font-size: 8px;
  font-weight: 700;
  text-anchor: middle;
}

.runner__jockey path {
  fill: #f4f4f4;
  stroke: rgb(0 0 0 / 0.5);
  stroke-width: 0.8;
}

.runner__helmet {
  fill: var(--coat);
  stroke: rgb(0 0 0 / 0.6);
  stroke-width: 0.8;
}

// Gallop: legs swing in opposite phase, body bobs. Transform only.
.runner--galloping {
  .runner__legs--front {
    animation: swing var(--gallop) ease-in-out infinite alternate;
  }

  .runner__legs--back {
    animation: swing var(--gallop) ease-in-out infinite alternate-reverse;
  }

  .runner__body {
    animation: bob calc(var(--gallop) / 2) ease-in-out infinite alternate;
  }
}

@keyframes swing {
  from {
    transform: rotate(-22deg);
  }

  to {
    transform: rotate(22deg);
  }
}

@keyframes bob {
  from {
    transform: translateY(-1px);
  }

  to {
    transform: translateY(1.2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .runner--galloping * {
    animation: none !important;
  }
}
</style>
