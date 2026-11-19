/**
 * Game rules from the case brief. Every rule number lives here — never hard-code them elsewhere.
 * Requirement IDs refer to docs/REQUIREMENTS.md.
 */

/** C1 — total number of horses in the game. */
export const HORSE_COUNT = 20

/** C5 — horses that run in each round, sampled from all horses. */
export const HORSES_PER_ROUND = 10

/** C3 — inclusive condition score range. */
export const CONDITION_MIN = 1
export const CONDITION_MAX = 100

/** C4, C6 — one entry per round, in metres. */
export const ROUND_DISTANCES = [1200, 1400, 1600, 1800, 2000, 2200] as const

/** C4 — number of rounds in a program. */
export const ROUND_COUNT = ROUND_DISTANCES.length

/**
 * C2 — one unique colour per horse. `key` is a language-neutral code the UI translates;
 * `hex` is used for the swatch and the runner on the track.
 */
export const HORSE_COLORS = [
  { key: 'red', hex: '#e53935' },
  { key: 'blue', hex: '#1e88e5' },
  { key: 'green', hex: '#43a047' },
  { key: 'yellow', hex: '#fdd835' },
  { key: 'orange', hex: '#fb8c00' },
  { key: 'purple', hex: '#8e24aa' },
  { key: 'pink', hex: '#ec407a' },
  { key: 'brown', hex: '#6d4c41' },
  { key: 'black', hex: '#212121' },
  { key: 'white', hex: '#fafafa' },
  { key: 'gray', hex: '#9e9e9e' },
  { key: 'cyan', hex: '#00acc1' },
  { key: 'lime', hex: '#cddc39' },
  { key: 'navy', hex: '#1a237e' },
  { key: 'teal', hex: '#00897b' },
  { key: 'maroon', hex: '#800000' },
  { key: 'olive', hex: '#808000' },
  { key: 'gold', hex: '#ffb300' },
  { key: 'lavender', hex: '#b39ddb' },
  { key: 'coral', hex: '#ff7f50' },
] as const

/** R2 — computing pioneers (a nod to the names in the brief's screenshot). Proper nouns, not translated. */
export const HORSE_NAMES = [
  'Ada Lovelace',
  'Grace Hopper',
  'Margaret Hamilton',
  'Joan Clarke',
  'Alan Turing',
  'Katherine Johnson',
  'Dorothy Vaughan',
  'Hedy Lamarr',
  'Barbara Liskov',
  'Frances Allen',
  'Radia Perlman',
  'Karen Spärck Jones',
  'Edsger Dijkstra',
  'Donald Knuth',
  'John von Neumann',
  'Claude Shannon',
  'Tim Berners-Lee',
  'Dennis Ritchie',
  'Ken Thompson',
  'Linus Torvalds',
] as const

/**
 * Race engine tuning (docs/ARCHITECTURE.md §5, ADR 0001).
 * Rounds take 6–9 s of race time whatever their length, so long rounds stay watchable.
 */
export const RACE_TIMING = {
  /** Race time of an average-speed horse in the shortest round. */
  shortestRoundMs: 6000,
  /** Race time of an average-speed horse in the longest round. */
  longestRoundMs: 9000,
} as const

/**
 * How condition turns into speed. A speed factor of 1 finishes in exactly the round duration.
 * Condition 1 → `minFactor`, condition 100 → `maxFactor`, then ± `variance` seeded noise per round,
 * so favourites usually — but not always — win (decision A5).
 */
export const SPEED_MODEL = {
  minFactor: 0.85,
  maxFactor: 1,
  variance: 0.08,
  /** Mid-race surges reshuffle the field without changing finish times. Sum must stay < 1. */
  surgeCount: 2,
  maxSurgeAmplitude: 0.2,
  maxSurgeFrequency: 3,
} as const

/** Positions that count as a podium finish (stats, predictions). */
export const PODIUM_SIZE = 3

/** Pause between two rounds before the next one starts on its own (A4), in race time. */
export const INTERMISSION_MS = 1500

/** Playback speeds the race clock supports. */
export const RACE_SPEEDS = [1, 2, 4] as const

/**
 * Independent random streams derived from one game seed (A11).
 * Changing a number here changes every seeded game — treat it as a format version.
 */
export const SEED_STREAMS = {
  horses: 1,
  schedule: 2,
  round: 3,
} as const
