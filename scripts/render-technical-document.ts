/**
 * Renders docs/technical-document/index.html to docs/Pioneer-Derby-Technical-Document.pdf.
 *
 *   npm run doc:pdf
 *
 * The cover line can carry the name of whoever the document is for: set TECH_DOC_COMPANY (for
 * example "Acme · ") when rendering. It is not part of the source, so the repository does not
 * name the company.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const source = resolve('docs/technical-document/index.html')
// Next to the source, so the relative paths of the fonts and images still resolve.
const rendered = resolve('docs/technical-document/.rendered.html')
const target = resolve('docs/Pioneer-Derby-Technical-Document.pdf')

writeFileSync(
  rendered,
  readFileSync(source, 'utf8').replace('{{company}}', process.env.TECH_DOC_COMPANY ?? ''),
)

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto(pathToFileURL(rendered).href)
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({
    path: target,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;padding:0 17mm;font:7.5pt Arial,sans-serif;color:#7a8396;display:flex;justify-content:space-between"><span>Pioneer Derby · Teknik Doküman · Emre Solmaz</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: '18mm', right: '17mm', bottom: '20mm', left: '17mm' },
  })
} finally {
  await browser.close()
  rmSync(rendered, { force: true })
}
console.info(`Wrote ${target}`)
