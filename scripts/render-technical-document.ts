/**
 * Renders docs/technical-document/index.html to docs/Pioneer-Derby-Technical-Document.pdf.
 *   npm run doc:pdf
 */
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const source = resolve('docs/technical-document/index.html')
const target = resolve('docs/Pioneer-Derby-Technical-Document.pdf')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(source).href)
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
await browser.close()
console.info(`Wrote ${target}`)
