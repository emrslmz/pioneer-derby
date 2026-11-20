/**
 * README media: desktop, mobile and dark screenshots plus a short GIF of round 1, all from the
 * seeded game (`?seed=42`) on a fixed clock, so every run produces the same frames.
 *
 *   npm run dev -- --port 5199      # in one terminal
 *   npm run media                   # in another (needs ffmpeg for the GIF)
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { chromium, type Page } from '@playwright/test'

const base = process.env.BASE_URL ?? 'http://localhost:5199'
const out = 'docs/media'
const START = new Date('2026-11-20T12:00:00Z')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()

async function open(
  viewport: { width: number; height: number },
  { dark = false, locale = 'en' }: { dark?: boolean; locale?: string } = {},
): Promise<Page> {
  const context = await browser.newContext({ viewport, colorScheme: dark ? 'dark' : 'light' })
  const page = await context.newPage()
  await page.addInitScript(
    ([theme, lang]) => {
      localStorage.setItem('pioneer-derby:tour', '1') // a returning visitor: no tour
      localStorage.setItem('pioneer-derby:theme', theme!)
      localStorage.setItem('pioneer-derby:locale', lang!)
    },
    [dark ? 'dark' : 'light', locale],
  )
  await page.clock.install({ time: START })
  await page.goto(`${base}/?seed=42`)
  await page.evaluate(() => document.fonts.ready)
  await page.clock.pauseAt(new Date(START.getTime() + 5_000))
  return page
}

async function settle(page: Page) {
  // Let the intro and loading animations (CSS, real time) finish before a screenshot.
  await page
    .waitForFunction(() => !document.documentElement.hasAttribute('data-intro'), null, {
      timeout: 10_000,
    })
    .catch(() => undefined)
  await page.waitForTimeout(1500)
}

// 1. Desktop, light: the program drawn, ready to start.
{
  const page = await open({ width: 1440, height: 900 })
  await page.getByTestId('track-generate').click()
  await settle(page)
  await page.screenshot({ path: join(out, 'desktop-light.png') })
}

// 2. Desktop, dark: a race under way with live results.
{
  const page = await open({ width: 1440, height: 900 }, { dark: true })
  await page.getByTestId('track-generate').click()
  await settle(page)
  await page.getByTestId('pick-tip-button').click()
  await page.getByRole('radio', { name: '8×' }).click()
  await page.getByTestId('toggle-button').click()
  await page.clock.runFor(8_200)
  await page.screenshot({ path: join(out, 'desktop-dark-race.png') })
}

// 3. Phone, Turkish.
{
  const page = await open({ width: 390, height: 844 }, { locale: 'tr' })
  await page.getByTestId('track-generate').click()
  await settle(page)
  await page.screenshot({ path: join(out, 'mobile-tr.png') })
}

// 4. GIF: round 1 at 8× on the dark theme, 250 ms of the fixed clock per frame.
{
  const frames = mkdtempSync(join(tmpdir(), 'pioneer-derby-frames-'))
  const page = await open({ width: 1280, height: 800 }, { dark: true })
  await page.getByTestId('track-generate').click()
  await settle(page)
  await page.getByRole('radio', { name: '8×' }).click()
  await page.getByTestId('toggle-button').click()
  for (let frame = 0; frame < 44; frame++) {
    await page.clock.runFor(250)
    await page.screenshot({ path: join(frames, `f${String(frame).padStart(3, '0')}.png`) })
  }
  const palette = join(frames, 'palette.png')
  const input = ['-y', '-framerate', '8', '-i', join(frames, 'f%03d.png')]
  const scale = 'scale=820:-1:flags=lanczos'
  execFileSync('ffmpeg', [...input, '-vf', `${scale},palettegen=max_colors=96`, palette], {
    stdio: 'ignore',
  })
  execFileSync(
    'ffmpeg',
    [
      ...input,
      '-i',
      palette,
      '-lavfi',
      `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`,
      join(out, 'demo.gif'),
    ],
    { stdio: 'ignore' },
  )
  rmSync(frames, { recursive: true, force: true })
}

await browser.close()
console.info(`Media written to ${out}/`)
