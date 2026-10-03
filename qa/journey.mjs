// World-only filmstrip of the whole journey (UI hidden), rendered at explicit progress values.
// usage: node qa/journey.mjs <outDir> [WxH=1440x900] [p,p,p,…]      (needs the dev server)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
const [width, height] = (process.argv[3] ?? '1440x900').split('x').map(Number)
const ps = (process.argv[4] ?? '0,0.1,0.2,0.3,0.4,0.5,0.55,0.6,0.67,0.72,0.77,0.81,0.85,0.89,0.93,1').split(',').map(Number)
const mobile = width < 700
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.addStyleTag({ content: 'main,.nav,.skip-link{visibility:hidden!important}' })
const storeUrl = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/world\/store\.ts/.test(n)))
for (const p of ps) {
  await page.evaluate(async ({ storeUrl, p }) => {
    const { worldStore } = await import(storeUrl)
    worldStore.setProgress(p)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))))
  }, { storeUrl, p })
  writeFileSync(`${out}/journey-${String(Math.round(p * 100)).padStart(3, '0')}.png`, await page.screenshot())
}
await browser.close()
console.log('wrote', ps.length, 'frames')
