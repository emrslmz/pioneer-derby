import { expect, test, type Page } from '@playwright/test'

/**
 * How far each horse has run, in px along the race map (the whole distance). The camera pans the
 * track, so on-screen positions are relative; the map is absolute.
 */
async function runnerOffsets(page: Page): Promise<number[]> {
  return page.getByTestId('map-dot').evaluateAll((dots) =>
    dots.map((dot) => {
      const run = dot.parentElement!.getBoundingClientRect()
      return dot.firstElementChild!.getBoundingClientRect().left - run.left
    }),
  )
}

const slowest = async (page: Page) => Math.min(...(await runnerOffsets(page)))

/** Lets real time pass in the page — used only to prove that something does NOT change. */
const idle = (page: Page, ms: number) =>
  page.evaluate((delay) => new Promise((resolve) => setTimeout(resolve, delay)), ms)

async function startRace(page: Page) {
  await page.goto('/?seed=42')
  await page.getByTestId('generate-button').click()
  await expect(page.getByTestId('runner')).toHaveCount(10)
  await page.getByTestId('toggle-button').click()
}

test.describe('race track', () => {
  test('[R6] the camera follows the race and full screen opens a modal', async ({ page }) => {
    await startRace(page)
    const world = page.getByTestId('track-world')
    await expect
      .poll(() => world.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41))
      .toBeLessThan(-20)

    await page.getByTestId('track-expand').click()
    const theater = page.getByTestId('track-theater')
    await expect(theater).toBeVisible()
    await expect(theater.getByTestId('race-track')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(theater).toBeHidden()
    await expect(page.getByTestId('track-expand')).toBeFocused()
  })

  test('[R6] the 10 horses of the round visibly move towards the finish', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await expect(page.getByTestId('runner')).toHaveCount(10)
    const start = await runnerOffsets(page)
    // Every horse starts at the same point of the map.
    expect(new Set(start.map((x) => Math.round(x))).size).toBe(1)

    await page.getByTestId('toggle-button').click()
    await expect
      .poll(async () => (await runnerOffsets(page)).every((x, i) => x > start[i]! + 5))
      .toBe(true)
    const early = await runnerOffsets(page)

    await expect
      .poll(async () => (await runnerOffsets(page)).every((x, i) => x > early[i]! + 5))
      .toBe(true)
  })

  test('[R4] pause freezes the horses on screen', async ({ page }) => {
    await startRace(page)
    await expect.poll(() => slowest(page)).toBeGreaterThan(10)
    await page.getByTestId('toggle-button').click()
    await expect(page.getByTestId('race-status')).toContainText('Paused')

    const frozen = await runnerOffsets(page)
    await idle(page, 800)
    expect(await runnerOffsets(page)).toEqual(frozen)
  })

  test('[X10] runners move by transform: no layout-triggering left/width changes', async ({
    page,
  }) => {
    await startRace(page)
    await expect.poll(() => slowest(page)).toBeGreaterThan(10)

    const styles = await page
      .getByTestId('runner')
      .evaluateAll((runners) => runners.map((runner) => (runner as HTMLElement).style.cssText))
    for (const style of styles) {
      expect(style).toMatch(/transform: translate3d\(/)
      expect(style).not.toMatch(/(^|;)\s*(left|width)\s*:/)
    }
  })

  test('[R6] the track keeps its size from the empty page to a running race', async ({ page }) => {
    await page.goto('/?seed=42')
    const track = page.getByTestId('race-track')
    const height = async () => (await track.boundingBox())!.height
    const idle = await height()

    await page.getByTestId('generate-button').click()
    await expect(page.getByTestId('runner')).toHaveCount(10)
    expect(await height()).toBe(idle)

    await page.getByTestId('toggle-button').click()
    await expect(page.getByTestId('leaderboard-entry')).toHaveCount(10)
    expect(await height()).toBe(idle)
  })
})
