import { describe, expect, it } from 'vitest'
import { analyseFairness, spearman } from '@/domain/fairness'

describe('fairness (statistical)', () => {
  // 1,500 programs = 9,000 rounds, ~0.1 s. Deterministic: same seeds every run.
  const report = analyseFairness(1500)

  it('[X1] average finishing position improves with every step up in condition (monotonic)', () => {
    const averages = report.buckets.map((b) => b.averagePosition)
    for (let i = 1; i < averages.length; i++) {
      expect(averages[i]).toBeLessThan(averages[i - 1]!)
    }
  })

  it('[X1] win and podium rates never drop as condition rises', () => {
    for (let i = 1; i < report.buckets.length; i++) {
      expect(report.buckets[i]!.winRate).toBeGreaterThanOrEqual(report.buckets[i - 1]!.winRate)
      expect(report.buckets[i]!.podiumRate).toBeGreaterThan(report.buckets[i - 1]!.podiumRate)
    }
  })

  it('[X1] condition and position are strongly correlated (Spearman ρ < −0.5)', () => {
    expect(report.spearman).toBeLessThan(-0.5)
  })

  it('[X1] favourites usually — but not always — win, and outsiders can win (A5)', () => {
    expect(report.favouriteWinRate).toBeGreaterThan(0.25)
    expect(report.favouriteWinRate).toBeLessThan(0.6)
    expect(report.upsetRate).toBeGreaterThan(0.05)
  })

  it('[X1] every condition range is sampled', () => {
    expect(report.rounds).toBe(9000)
    for (const bucket of report.buckets) expect(bucket.runs).toBeGreaterThan(5000)
  })
})

describe('spearman', () => {
  it('[X1] is 1 / −1 for perfectly ordered data and handles ties', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1)
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1)
    expect(spearman([1, 1, 2, 2], [1, 1, 2, 2])).toBeCloseTo(1)
  })
})
