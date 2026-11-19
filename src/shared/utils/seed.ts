/**
 * Game seed helpers (X11). A seed is a uint32 shown in the URL as `?seed=123`,
 * so any race can be replayed or shared.
 */

export const SEED_PARAM = 'seed'
const MAX_SEED = 0xffff_ffff

export function parseSeed(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null
  const seed = Number(value)
  return seed <= MAX_SEED ? seed : null
}

export function readSeedFromUrl(search = globalThis.location?.search ?? ''): number | null {
  return parseSeed(new URLSearchParams(search).get(SEED_PARAM))
}

/** Updates `?seed=` without adding a history entry or reloading. */
export function writeSeedToUrl(seed: number): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set(SEED_PARAM, String(seed))
  window.history.replaceState(window.history.state, '', url)
}

/** Fresh unpredictable seed from the platform CSPRNG (the domain RNG stays deterministic). */
export function createRandomSeed(): number {
  const [value] = globalThis.crypto.getRandomValues(new Uint32Array(1))
  return value ?? 0
}
