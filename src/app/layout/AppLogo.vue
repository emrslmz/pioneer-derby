<template>
  <svg class="logo" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--color-accent)" />
        <stop offset="1" stop-color="#ff8a3d" />
      </linearGradient>
    </defs>
    <rect width="40" height="40" rx="11" fill="url(#logo-gradient)" />
    <path
      d="M12 9v11a8 8 0 0 0 16 0V9"
      fill="none"
      stroke="#fff"
      stroke-width="4.5"
      stroke-linecap="round"
    />
    <g fill="var(--color-accent-strong)">
      <circle cx="12" cy="13" r="1.1" />
      <circle cx="12" cy="18" r="1.1" />
      <circle cx="28" cy="13" r="1.1" />
      <circle cx="28" cy="18" r="1.1" />
    </g>
  </svg>
</template>

<style scoped lang="scss">
.logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  filter: drop-shadow(0 4px 12px rgb(244 72 43 / 0.45));
}
</style>
