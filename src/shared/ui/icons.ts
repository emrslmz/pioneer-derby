/** Small hand-drawn icon set (24×24 grid). Stroke icons use currentColor; `fill` icons are solid. */
export const ICONS = {
  play: { d: 'M7 4.5v15l12.5-7.5z', fill: true },
  pause: { d: 'M6.5 4h4v16h-4zM13.5 4h4v16h-4z', fill: true },
  generate: {
    d: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4',
    fill: false,
  },
  sun: {
    d: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    fill: false,
  },
  moon: { d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', fill: false },
  system: { d: 'M3 5h18v11H3zM8 20h8M12 16v4', fill: false },
  keyboard: { d: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10', fill: false },
  globe: {
    d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
    fill: false,
  },
  horses: { d: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01', fill: false },
  track: { d: 'M5 21V4M5 4h11l-2 4 2 4H5', fill: false },
  program: { d: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', fill: false },
  results: {
    d: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8',
    fill: false,
  },
  close: { d: 'M6 6l12 12M18 6 6 18', fill: false },
  speed: { d: 'M12 14l4-4M4.5 18a9 9 0 1 1 15 0', fill: false },
} as const

export type IconName = keyof typeof ICONS
