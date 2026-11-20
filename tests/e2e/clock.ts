import type { Page } from '@playwright/test'

/**
 * Races run at a real pace (1200 m ≈ 73 s, 2200 m ≈ 2.5 min), so E2E tests watch at 8× on
 * Playwright's fake clock and move time forward instead of waiting for it.
 */
export const FAST = '8×'

/** Real ms at 8× after which round 1 (1200 m) has certainly finished, but not its 6 s break. */
export const ROUND_1_AT_8X = 11_000

/** Real ms at 8× for the whole program: ~650 s of racing / 8, plus five 6 s breaks. */
export const PROGRAM_AT_8X = 130_000

export async function installClock(page: Page) {
  await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') })
}

/** Moves the fake clock in small steps until `check` passes (a condition with no known time). */
export async function runUntil(page: Page, check: () => Promise<boolean>, maxMs = 120_000) {
  for (let ms = 0; ms < maxMs; ms += 500) {
    if (await check()) return
    await page.clock.runFor(500)
  }
  throw new Error(`condition not met within ${maxMs} ms of race clock`)
}
