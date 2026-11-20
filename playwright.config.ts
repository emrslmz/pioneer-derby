import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
// A dedicated port, so E2E never talks to some other dev server already running on 5173.
const port = isCI ? 4173 : 5199
const baseURL = `http://localhost:${port}`

/**
 * What a returning visitor has stored. Every test starts as one: the first-visit tour would cover
 * the page, and the light default theme would hide the emulated colour scheme. Tests of the first
 * visit itself opt out with `test.use({ storageState: FIRST_VISIT })`.
 */
const RETURNING_VISITOR = {
  cookies: [],
  origins: [
    {
      origin: baseURL,
      localStorage: [
        { name: 'pioneer-derby:tour', value: '1' },
        { name: 'pioneer-derby:theme', value: 'system' },
      ],
    },
  ],
}

/**
 * Two projects share one config:
 * - `e2e`    → user flows (tests/e2e)
 * - `visual` → seeded, motion-free screenshot tests (tests/visual)
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    storageState: RETURNING_VISITOR,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testDir: './tests/visual',
      // Baselines are per platform; CI (Linux) is authoritative. See README → Testing.
      snapshotPathTemplate: '{testDir}/__snapshots__/{arg}-{platform}{ext}',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0.002,
          animations: 'disabled',
          // Hides scrollbars during screenshots: their fade timing is not deterministic.
          stylePath: './tests/visual/screenshot.css',
        },
      },
    },
  ],
  webServer: {
    command: isCI
      ? 'npm run build-only && npm run preview'
      : `npm run dev -- --port ${port} --strictPort`,
    port,
    // Always start our own server: reusing an unknown one silently tests the wrong app.
    reuseExistingServer: false,
    env: { NO_DEVTOOLS: '1' },
  },
})
