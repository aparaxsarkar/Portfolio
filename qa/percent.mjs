// Screenshots the real page (UI included) at given percentages of the total scroll range.
// usage: node qa/percent.mjs <outDir> [WxH=1440x900] [0,10,25,50,75,90,95,100] [--url=…]
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const out = args[0]
const [width, height] = (args[1] ?? '1440x900').split('x').map(Number)
const pcts = (args[2] ?? '0,10,25,50,75,90,95,100').split(',').map(Number)
const mobile = width < 700
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
const errors = []
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(url, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)
const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
for (const p of pcts) {
  await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), Math.round((p / 100) * max))
  await page.waitForTimeout(450)
  writeFileSync(`${out}/pct-${String(p).padStart(3, '0')}.png`, await page.screenshot())
}
await browser.close()
console.log(`${width}x${height}: ${pcts.length} frames, maxScroll ${max}${errors.length ? ' · CONSOLE: ' + errors.join(' | ') : ' · no console errors'}`)
