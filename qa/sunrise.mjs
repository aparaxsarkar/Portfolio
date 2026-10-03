// Terminal-sun geometry, measured from rendered pixels at every target viewport.
//   - disc extent: the bright disc in the SKY layer around the sun's position
//   - skyline:     the first opaque pixel of the LAND layer in each disc column
// Requirement at progress = 1: the whole disc is visible (not buried), and it sits immediately on the skyline (no sky gap).
// usage: node qa/sunrise.mjs [--url=http://localhost:5173/] [--dump=<dir>]      (needs the dev server)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const dump = process.argv.find((a) => a.startsWith('--dump='))?.slice(7)
const SIZES = [[390, 844], [430, 932], [1280, 800], [1440, 900], [1920, 1080]]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let failed = 0
for (const [width, height] of SIZES) {
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.addStyleTag({ content: 'main,.nav,.skip-link{visibility:hidden!important}' })
  const m = await page.evaluate(async () => {
    const storeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/world\/store\.ts/.test(n))
    const { worldStore } = await import(storeUrl)
    worldStore.setProgress(1)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))))
    const [sky, , land] = document.querySelectorAll('canvas')
    const state = worldStore.get()
    const W = sky.width
    const H = sky.height
    const dpr = W / innerWidth
    const sx = Math.round(state.sun.x * W)
    const sy = Math.round(state.sun.y * H)
    const lg = land.getContext('2d', { willReadFrequently: true })
    // Isolate the disc: re-render the sky with the app's own renderer but with everything except the sun blacked out
    // (gradient, glow, clouds), so the mask is the disc and not its bloom.
    const { drawSky } = await import('/src/world/render/sky.ts')
    const off = document.createElement('canvas')
    off.width = W
    off.height = H
    const og = off.getContext('2d', { willReadFrequently: true })
    const black = [0, 0, 0]
    const view = { w: W / dpr, h: H / dpr, dpr, k: H / dpr / 900, widthD: (W / dpr) * 900 / (H / dpr), horizonPx: (H / dpr) * 0.64 }
    drawSky(og, { ...state, sky: { ...state.sky, top: black, mid: black, horizon: black, haze: black }, sun: { ...state.sun, glow: black, color: [255, 255, 255], glowStrength: 0 }, terrain: { ...state.terrain, cloud: black } }, view, null)
    const R = Math.round(H * 0.09) // search window
    const x0 = Math.max(0, sx - R), y0 = Math.max(0, sy - R), w = Math.min(W - x0, 2 * R), h = Math.min(H - y0, 2 * R)
    const sd = og.getImageData(x0, y0, w, h).data
    const ld = lg.getImageData(x0, y0, w, h).data
    const lum = (i) => 0.2126 * sd[i] + 0.7152 * sd[i + 1] + 0.0722 * sd[i + 2]
    const thr = 255 * 0.9 // the disc is solid; its soft edge and the bloom fall below this
    const mask = new Uint8Array(w * h)
    let total = 0, visible = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (lum(i) >= thr) {
        mask[y * w + x] = 1
        total++
        if (ld[i + 3] < 128) visible++
      }
    }
    // per-column: lowest disc pixel vs first opaque land pixel at or below the disc's top
    let top = h, bottom = -1, left = w, right = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) { top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x) }
    const cx = Math.round((left + right) / 2)
    const gaps = []
    for (let x = Math.round(cx - (right - left) * 0.3); x <= Math.round(cx + (right - left) * 0.3); x++) {
      let discBottom = -1
      for (let y = h - 1; y >= 0; y--) if (mask[y * w + x]) { discBottom = y; break }
      let landTop = h
      for (let y = top; y < h; y++) if (ld[(y * w + x) * 4 + 3] >= 128) { landTop = y; break }
      if (discBottom >= 0) gaps.push(landTop - discBottom - 1)
    }
    return { dpr, sun: state.sun, total, visible, discH: bottom - top + 1, discW: right - left + 1, gaps, h }
  })
  const k = (height / 900) * m.dpr // device px per design unit
  const frac = m.visible / m.total
  const gapMin = Math.min(...m.gaps) / k
  const gapMed = m.gaps.sort((a, b) => a - b)[Math.floor(m.gaps.length / 2)] / k
  const ok = frac >= 0.985 && gapMed <= 5 && gapMed >= -1.5
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${String(width).padStart(4)}×${String(height).padEnd(4)} disc ${(m.discW / m.dpr).toFixed(0)}px  visible ${(frac * 100).toFixed(1)}%  gap to skyline: centre ${gapMed.toFixed(1)} design-px (min ${gapMin.toFixed(1)})`)
  if (dump) writeFileSync(`${dump}/sunrise-${width}x${height}.png`, await page.screenshot())
  await page.close()
}
await browser.close()
console.log(failed ? `\n${failed} viewport(s): final sun is buried or floating` : '\nfinal sun is fully visible and sits on the skyline at every viewport')
process.exit(failed ? 1 : 0)
