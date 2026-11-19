import { expect, test, type Page } from '@playwright/test'

/** Horizontal offset of every runner relative to its lane, read from the rendered layout. */
async function runnerOffsets(page: Page): Promise<number[]> {
  return page.getByTestId('runner').evaluateAll((runners) =>
    runners.map((runner) => {
      const lane = runner.parentElement!.getBoundingClientRect()
      return runner.getBoundingClientRect().left - lane.left
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
  test('[R6] the 10 horses of the round visibly move towards the finish', async ({ page }) => {
    await page.goto('/?seed=42')
    await page.getByTestId('generate-button').click()
    await expect(page.getByTestId('runner')).toHaveCount(10)
    const start = await runnerOffsets(page)
    expect(start.every((x) => Math.abs(x) < 1)).toBe(true)

    await page.getByTestId('toggle-button').click()
    await expect.poll(() => slowest(page)).toBeGreaterThan(20)
    const early = await runnerOffsets(page)

    await expect
      .poll(async () => (await runnerOffsets(page)).every((x, i) => x > early[i]! + 20))
      .toBe(true)
  })

  test('[R4] pause freezes the horses on screen', async ({ page }) => {
    await startRace(page)
    await expect.poll(() => slowest(page)).toBeGreaterThan(20)
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
      expect(style).toMatch(/^transform: translate3d\(/)
      expect(style).not.toMatch(/left|width/)
    }
  })
})
