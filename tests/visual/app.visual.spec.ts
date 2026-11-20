import { expect, test, type Page } from '@playwright/test'

/**
 * B3 — visual regression. Baselines are Linux screenshots produced in CI (see README → Testing);
 * a missing baseline fails the run instead of passing silently.
 */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
} as const

async function open(
  page: Page,
  { scheme, locale }: { scheme: 'light' | 'dark'; locale: 'en' | 'tr' },
) {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
  await page.addInitScript((value) => localStorage.setItem('pioneer-derby:locale', value), locale)
  await page.goto('/?seed=42')
  await page.evaluate(() => document.fonts.ready)
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  for (const scheme of ['light', 'dark'] as const) {
    for (const locale of ['en', 'tr'] as const) {
      test(`[B3] [T2] ${device} · ${scheme} · ${locale}: program ready`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await open(page, { scheme, locale })
        await page.getByTestId('generate-button').click()
        await expect(page.getByTestId('runner')).toHaveCount(10)
        await expect(page).toHaveScreenshot(`${device}-${scheme}-${locale}.png`)
      })
    }
  }
}

test.describe('frozen race moments', () => {
  test.beforeEach(async ({ page }) => {
    // Playwright's clock drives timers, performance.now and requestAnimationFrame together,
    // so a race frame is identical on every run.
    await page.clock.install({ time: new Date('2026-11-20T12:00:00Z') })
    await page.setViewportSize(VIEWPORTS.desktop)
    await open(page, { scheme: 'dark', locale: 'en' })
    // Freeze time: from here on it only moves with runFor().
    await page.clock.pauseAt(new Date('2026-11-20T12:00:05Z'))
    await page.getByTestId('generate-button').click()
    await page.getByTestId('toggle-button').click()
  })

  test('[B3] [R6] mid-race: horses spread across the track', async ({ page }) => {
    await page.clock.runFor(3_500)
    await expect(page).toHaveScreenshot('desktop-dark-en-mid-race.png')
  })

  test('[B3] [X13] between rounds: result board and winner lane', async ({ page }) => {
    await expect(page.getByTestId('round-result')).toHaveCount(0)
    // Seed 42's first round lasts ~14.8 s; manual advance keeps its result visible.
    await page.clock.runFor(16_000)
    await expect(page.getByTestId('round-result')).toBeVisible()
    await expect(page).toHaveScreenshot('desktop-dark-en-podium.png')
  })
})
