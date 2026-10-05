// Binary diagnostic for sun noise on the FINAL COMPOSITED PIXELS (what a screen shows), not canvas readbacks.
// Loads the page at a phone density, goes to 100% progress, hides the page content, and measures speckle (std-dev of
// luminance after removing the local 5x5 mean) inside the UPPER half of the sun disc and in the glow ring above it — while switching
// individual layers/effects off, so each contribution can be read directly.
// Gate: --max-disc=<σ> --max-glow=<σ> exit non-zero if the 'as served' disc / glow-core noise exceeds the limit (use with --only-served).
// usage: node qa/sun-composite.mjs [--engine=chromium|webkit] [--url=http://localhost:5173/] [--w=393 --h=852 --dpr=3] [--headed] [--dump=<dir>]
import { chromium, webkit } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=').slice(1).join('=')
const url = arg('url', 'http://localhost:5173/')
const W = +arg('w', 393), H = +arg('h', 852), DPR = +arg('dpr', 3)
const dump = arg('dump', '')
const headed = process.argv.includes('--headed')
const engine = arg('engine', 'chromium') // chromium (system Chrome) | webkit (Playwright's WebKit: the engine behind iOS Safari)
const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: !headed })

// [label, init-script, css]
const ONLY = process.argv.includes('--only-served')
const VARIANTS = [
  ['as served', '', ''],
  ['grain texture disabled (createPattern → null)', 'CanvasRenderingContext2D.prototype.createPattern = () => null', ''],
  ['land canvas hidden', '', '.world canvas:nth-child(3){visibility:hidden!important}'],
  ['stars canvas hidden', '', '.world canvas:nth-child(2){visibility:hidden!important}'],
  ['vignette (.world::after) off', '', '.world::after{display:none!important}'],
  ['ALL of the above off (sky canvas only, no grain)', 'CanvasRenderingContext2D.prototype.createPattern = () => null', '.world canvas:nth-child(2),.world canvas:nth-child(3){visibility:hidden!important}.world::after{display:none!important}'],
]
const SUN = { x: 0.715, y: 0.608 } // resting position at 100% (config/world.ts SUN_PATH x1, yEnd)

let gateFailed = false
let i = 0
for (const [label, init, css] of ONLY ? VARIANTS.slice(0, 1) : VARIANTS) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: W < 700, hasTouch: W < 700 })
  const page = await ctx.newPage()
  if (init) await page.addInitScript(init)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: `main,.nav,.skip-link{visibility:hidden!important}${css}` })
  await page.evaluate(() => scrollTo({ top: 1e7, behavior: 'instant' }))
  await page.waitForTimeout(900)
  const facts = await page.evaluate(() => {
    const c = document.querySelectorAll('canvas')
    return { dpr: devicePixelRatio, canvases: [...c].map((k) => ({ backing: `${k.width}×${k.height}`, css: `${k.getBoundingClientRect().width}×${k.getBoundingClientRect().height}` })) }
  })
  const png = await page.screenshot()
  if (dump) writeFileSync(`${dump}/composite-${i}.png`, png)
  const stats = await page.evaluate(async ({ b64, W, H, DPR, SUN }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
    const cx = Math.round(SUN.x * W * DPR), cy = Math.round(SUN.y * H * DPR)
    const rDisc = Math.round(H * 0.027 * 1.4 * DPR * 0.8) // inside the disc
    const search = Math.round(rDisc * 3.2 * 5)
    const d = g.getImageData(cx - search, cy - search, 2 * search + 1, 2 * search + 1).data
    const w = 2 * search + 1
    const L = (x, y) => { const i = (y * w + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] }
    const resid = (x, y) => { let m = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) m += L(x + i, y + j); return L(x, y) - m / 25 }
    // Upper half only: the skyline cuts into the lower part of the disc, and terrain edges are not 'grain'.
    const band = (r0, r1) => { let s = 0, n = 0; for (let y = 3; y < search - 2; y++) for (let x = 3; x < w - 3; x++) { const r = Math.hypot(x - search, y - search); if (r >= r0 && r < r1) { const e = resid(x, y); s += e * e; n++ } } return Math.sqrt(s / n) }
    const u = rDisc / 0.8 / 1.4 / 1.0 // ≈ sun-disc radius unit in device px (rDisc is 0.8 × 1.4 × 0.027H × DPR)
    return { disc: band(0, rDisc), glow: band(rDisc * 1.5, rDisc * 3), centreLum: L(search, search), rings: { 'glow core (≤3.4r)': band(rDisc * 1.3, u * 3.0), 'feather (4–8r)': band(u * 4.5, u * 8), 'plain sky (>10r)': band(u * 10.5, u * 14) } }
  }, { b64: png.toString('base64'), W, H, DPR, SUN })
  console.log(`${label.padEnd(52)} disc σ ${stats.disc.toFixed(2)}   glow-core σ ${stats.rings['glow core (≤3.4r)'].toFixed(2)}   feather σ ${stats.rings['feather (4–8r)'].toFixed(2)}   plain-sky σ ${stats.rings['plain sky (>10r)'].toFixed(2)}${i === 0 ? `\n   env: devicePixelRatio ${facts.dpr}; ` + facts.canvases.map((c, k) => `canvas${k} backing ${c.backing} → css ${c.css}`).join('; ') : ''}`)
  if (i === 0) {
    const maxDisc = +arg('max-disc', 'Infinity'), maxGlow = +arg('max-glow', 'Infinity')
    if (stats.disc > maxDisc || stats.rings['glow core (≤3.4r)'] > maxGlow) { gateFailed = true; console.log(`   ✗ above the gate (disc ≤ ${maxDisc}, glow core ≤ ${maxGlow})`) }
  }
  i++
  await ctx.close()
}
await browser.close()
if (gateFailed) process.exit(1)
