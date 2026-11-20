/** X6 — enforce the compressed production payload, including lazy chunks and fonts. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import process from 'node:process'

function filesIn(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })
}

const files = filesIn('dist')
const budgets = [
  { name: 'JavaScript', matches: /\.js$/, maxKiB: 120 },
  { name: 'CSS', matches: /\.css$/, maxKiB: 30 },
  { name: 'All assets (including fonts)', matches: /./, maxKiB: 650 },
]

for (const budget of budgets) {
  const bytes = files
    .filter((path) => budget.matches.test(path))
    .reduce((sum, path) => sum + gzipSync(readFileSync(path)).length, 0)
  const kib = bytes / 1024
  console.info(`${budget.name}: ${kib.toFixed(1)} / ${budget.maxKiB} KiB gzip`)
  if (kib > budget.maxKiB) process.exitCode = 1
}
