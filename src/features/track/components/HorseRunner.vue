<script setup lang="ts">
/**
 * A side-view racehorse in its own colour with the horse number on the saddle cloth.
 * Far-side legs, mane and tail use a darker shade of the coat for depth; a ground shadow anchors
 * it to the turf. Purely visual (`aria-hidden`); the track label and tables carry the information.
 * The gallop is CSS transform animation on legs and body only.
 */
defineProps<{ color: string; number: number; galloping: boolean }>()
</script>

<template>
  <svg
    class="runner"
    :class="{ 'runner--galloping': galloping }"
    viewBox="0 0 72 46"
    aria-hidden="true"
    focusable="false"
    :style="{ '--coat': color }"
  >
    <ellipse class="runner__shadow" cx="33" cy="43" rx="22" ry="2.6" />
    <g class="runner__body">
      <!-- far side: darker -->
      <g class="runner__legs runner__legs--back runner__far">
        <path d="M23 26 L27 41" />
      </g>
      <g class="runner__legs runner__legs--front runner__far">
        <path d="M43 26 L38 41" />
      </g>
      <path class="runner__tail runner__far" d="M15 17 C7 15 3 24 1 32 C8 29 13 25 16 22 Z" />
      <!-- body, neck, head -->
      <ellipse class="runner__coat" cx="31" cy="20" rx="17" ry="8" />
      <path class="runner__coat" d="M42 16 L52 6 L58 4 L67 11 L65 15 L57 13 L51 22 Z" />
      <path class="runner__coat" d="M55 5 L56.5 0 L59 5 Z" />
      <path class="runner__mane runner__far" d="M43 15 L52 5 L55 5 L46 17 Z" />
      <circle class="runner__eye" cx="60" cy="8.5" r="1" />
      <!-- near side -->
      <g class="runner__legs runner__legs--back">
        <path d="M19 25 L13 41" />
      </g>
      <g class="runner__legs runner__legs--front">
        <path d="M46 24 L52 40" />
      </g>
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
  --coat-dark: color-mix(in srgb, var(--coat) 62%, #000);

  display: block;
  height: 100%;
  overflow: visible;
  // A light halo plus a shadow keeps green or dark coats readable on the turf.
  filter: drop-shadow(0 0 1.2px rgb(255 255 255 / 0.9)) drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.45));
}

.runner__shadow {
  fill: rgb(0 0 0 / 0.32);
}

.runner__coat {
  fill: var(--coat);
  stroke: rgb(0 0 0 / 0.6);
  stroke-width: 1;
  stroke-linejoin: round;
}

.runner__tail.runner__far,
.runner__mane {
  fill: var(--coat-dark);
  stroke: rgb(0 0 0 / 0.55);
  stroke-width: 0.8;
  stroke-linejoin: round;
}

.runner__eye {
  fill: #111;
}

.runner__legs path {
  fill: none;
  stroke: var(--coat);
  stroke-width: 3.8;
  stroke-linecap: round;
}

.runner__legs.runner__far path {
  stroke: var(--coat-dark);
}

.runner__legs {
  transform-box: fill-box;
  transform-origin: 50% 0;
}

.runner__cloth {
  fill: #fff;
  stroke: rgb(0 0 0 / 0.4);
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
  fill: #f6f6f6;
  stroke: rgb(0 0 0 / 0.55);
  stroke-width: 0.8;
}

.runner__helmet {
  fill: var(--coat);
  stroke: rgb(0 0 0 / 0.6);
  stroke-width: 0.8;
}

// Gallop: near and far legs swing in opposite phase, body bobs. Transform only.
.runner--galloping {
  .runner__legs--front:not(.runner__far),
  .runner__legs--back.runner__far {
    animation: swing var(--gallop) ease-in-out infinite alternate;
  }

  .runner__legs--back:not(.runner__far),
  .runner__legs--front.runner__far {
    animation: swing var(--gallop) ease-in-out infinite alternate-reverse;
  }

  .runner__body {
    animation: bob calc(var(--gallop) / 2) ease-in-out infinite alternate;
  }
}

@keyframes swing {
  from {
    transform: rotate(-24deg);
  }

  to {
    transform: rotate(24deg);
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
