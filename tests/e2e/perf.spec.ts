import { expect, test } from '@playwright/test'

interface FrameMetrics {
  frames: number
  medianMs: number
  p95Ms: number
  fps: number
  longTasks: number
  longestTaskMs: number
}

/**
 * X10 — measures the real animation in the browser: frame intervals from requestAnimationFrame and
 * long tasks (> 50 ms) from PerformanceObserver, over 4 s of racing at 4×.
 * Thresholds are set for shared CI runners; the measured numbers are attached to the report.
 */
test('[X10] the race animates smoothly without long main-thread tasks', async ({
  page,
}, testInfo) => {
  await page.goto('/?seed=42')
  await page.getByTestId('generate-button').click()
  await page.getByRole('radio', { name: '4×' }).click()

  await page.evaluate(() => {
    const state = { intervals: [] as number[], longTasks: [] as number[], done: false }
    ;(window as unknown as { __perf: typeof state }).__perf = state
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.longTasks.push(entry.duration)
    }).observe({ type: 'longtask' })
    let last = 0
    const started = performance.now()
    const tick = (now: number) => {
      if (last) state.intervals.push(now - last)
      last = now
      if (now - started < 4000) requestAnimationFrame(tick)
      else state.done = true
    }
    requestAnimationFrame(tick)
  })

  await page.getByTestId('toggle-button').click()
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __perf: { done: boolean } }).__perf.done),
      {
        timeout: 10_000,
      },
    )
    .toBe(true)

  const metrics: FrameMetrics = await page.evaluate(() => {
    const { intervals, longTasks } = (
      window as unknown as { __perf: { intervals: number[]; longTasks: number[] } }
    ).__perf
    const sorted = [...intervals].sort((a, b) => a - b)
    const at = (q: number) =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
    const median = at(0.5)
    return {
      frames: intervals.length,
      medianMs: Math.round(median * 10) / 10,
      p95Ms: Math.round(at(0.95) * 10) / 10,
      fps: Math.round(1000 / median),
      longTasks: longTasks.length,
      longestTaskMs: Math.round(Math.max(0, ...longTasks)),
    }
  })

  await testInfo.attach('frame-metrics.json', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  })
  testInfo.annotations.push({ type: 'perf', description: JSON.stringify(metrics) })

  expect(metrics.frames).toBeGreaterThan(100)
  expect(metrics.medianMs).toBeLessThanOrEqual(20) // ≥ 50 fps typical frame
  expect(metrics.p95Ms).toBeLessThanOrEqual(50)
  expect(metrics.longestTaskMs).toBeLessThan(100)
})
