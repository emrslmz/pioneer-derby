/**
 * Fairness Monte Carlo (X1): `npm run simulate [-- --programs 10000]`
 *
 * Plays seeded programs through the real race engine and writes:
 * - docs/fairness.json                         raw numbers
 * - docs/fairness-light.svg / -dark.svg        win rate by condition (GitHub light / dark)
 * - README.md between <!-- fairness:start --> and <!-- fairness:end -->
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { analyseFairness, type FairnessReport } from '../src/domain/fairness'
import { writeFormatted } from './write-formatted'

const root = resolve(import.meta.dirname, '..')
const programsArg = process.argv.indexOf('--programs')
const programs = programsArg > -1 ? Number(process.argv[programsArg + 1]) : 10_000

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits)} %`

// ── Chart (dataviz rules: one series, one axis, thin bars with 4px rounded tops, 2px gaps,
//    recessive grid, selective direct labels, text in text colours, table view in the README) ──
interface Theme {
  surface: string
  text: string
  muted: string
  grid: string
  bar: string
}
const THEMES: Record<'light' | 'dark', Theme> = {
  light: { surface: '#ffffff', text: '#1f2328', muted: '#59636e', grid: '#d1d9e0', bar: '#f4482b' },
  dark: { surface: '#0d1117', text: '#e6edf3', muted: '#9198a1', grid: '#3d444d', bar: '#f4482b' },
}

function chart(report: FairnessReport, theme: Theme): string {
  const W = 720
  const H = 360
  const M = { top: 64, right: 24, bottom: 56, left: 56 }
  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const yMax = Math.ceil((Math.max(...report.buckets.map((b) => b.winRate)) * 10) / 1) / 10 // next 10 %
  const y = (value: number) => M.top + plotH - (value / yMax) * plotH
  const band = plotW / report.buckets.length
  const gap = 2
  const barW = Math.min(44, band - gap)

  const grid = Array.from({ length: Math.round(yMax * 10) + 1 }, (_, i) => i / 10)
    .map(
      (
        v,
      ) => `<line x1="${M.left}" x2="${W - M.right}" y1="${y(v)}" y2="${y(v)}" stroke="${theme.grid}" stroke-width="1"/>
  <text x="${M.left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="12" fill="${theme.muted}">${v * 100}%</text>`,
    )
    .join('\n  ')

  const last = report.buckets.length - 1
  const bars = report.buckets
    .map((b, i) => {
      const x = M.left + i * band + (band - barW) / 2
      const top = y(b.winRate)
      const base = y(0)
      const r = Math.min(4, base - top)
      const d = `M${x} ${base} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + barW - r} Q${x + barW} ${top} ${x + barW} ${top + r} V${base} Z`
      const label =
        i === 0 || i === last
          ? `<text x="${x + barW / 2}" y="${top - 6}" text-anchor="middle" font-size="12" font-weight="600" fill="${theme.text}">${pct(b.winRate)}</text>`
          : ''
      return `<path d="${d}" fill="${theme.bar}"><title>Condition ${b.from}–${b.to}: ${pct(b.winRate)} wins, ${pct(b.podiumRate)} podiums, avg. position ${b.averagePosition.toFixed(2)}</title></path>
  ${label}
  <text x="${M.left + i * band + band / 2}" y="${H - M.bottom + 18}" text-anchor="middle" font-size="12" fill="${theme.muted}">${b.from}–${b.to}</text>`
    })
    .join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title desc" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
  <title id="title">Win rate by condition</title>
  <desc id="desc">${report.rounds.toLocaleString('en')} seeded rounds. Win rate rises with condition from ${pct(report.buckets[0]!.winRate)} to ${pct(report.buckets[last]!.winRate)}; Spearman rho ${report.spearman}.</desc>
  <rect width="${W}" height="${H}" fill="${theme.surface}"/>
  <text x="${M.left}" y="28" font-size="16" font-weight="700" fill="${theme.text}">Win rate by condition</text>
  <text x="${M.left}" y="48" font-size="12" fill="${theme.muted}">${report.programs.toLocaleString('en')} programs · ${report.rounds.toLocaleString('en')} rounds · Spearman ρ (condition, position) = ${report.spearman}</text>
  ${grid}
  ${bars}
  <text x="${M.left + plotW / 2}" y="${H - 12}" text-anchor="middle" font-size="12" fill="${theme.muted}">Condition</text>
</svg>
`
}

function readmeTable(report: FairnessReport): string {
  const rows = report.buckets
    .map(
      (b) =>
        `| ${b.from}–${b.to} | ${b.runs.toLocaleString('en')} | ${pct(b.winRate)} | ${pct(b.podiumRate)} | ${b.averagePosition.toFixed(2)} |`,
    )
    .join('\n')
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/fairness-dark.svg">
  <img alt="Win rate by condition: rises from ${pct(report.buckets[0]!.winRate)} for condition 1–10 to ${pct(report.buckets.at(-1)!.winRate)} for 91–100" src="docs/fairness-light.svg">
</picture>

**${report.programs.toLocaleString('en')} programs · ${report.rounds.toLocaleString('en')} rounds.** Spearman ρ between condition and
finishing position: **${report.spearman}** · best-conditioned runner wins **${pct(report.favouriteWinRate)}** of rounds
(chance: 10 %) · a horse outside the top-3 conditions wins **${pct(report.upsetRate)}** — favourites usually, not always.

| Condition | Runs | Win rate | Podium rate | Avg. position |
| --- | --- | --- | --- | --- |
${rows}

_Generated by \`npm run simulate\`._`
}

const report = analyseFairness(programs)
await writeFormatted(resolve(root, 'docs/fairness.json'), JSON.stringify(report))
writeFileSync(resolve(root, 'docs/fairness-light.svg'), chart(report, THEMES.light))
writeFileSync(resolve(root, 'docs/fairness-dark.svg'), chart(report, THEMES.dark))

const readmePath = resolve(root, 'README.md')
const readme = readFileSync(readmePath, 'utf8')
const start = '<!-- fairness:start -->'
const end = '<!-- fairness:end -->'
if (readme.includes(start) && readme.includes(end)) {
  const before = readme.slice(0, readme.indexOf(start) + start.length)
  const after = readme.slice(readme.indexOf(end))
  await writeFormatted(readmePath, `${before}\n\n${readmeTable(report)}\n\n${after}`)
}

console.table(
  report.buckets.map((b) => ({
    condition: `${b.from}–${b.to}`,
    runs: b.runs,
    win: pct(b.winRate),
    podium: pct(b.podiumRate),
    'avg position': b.averagePosition,
  })),
)
console.log(
  `${report.rounds} rounds · Spearman ρ ${report.spearman} · favourite wins ${pct(report.favouriteWinRate)} · upsets ${pct(report.upsetRate)}`,
)
