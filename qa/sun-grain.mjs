// Is the sun grainy? Measures pixel noise (std-dev of luminance after removing the smooth trend) inside the sun disc and in
// its halo, from (a) the sky canvas as painted, (b) the same canvas painted without the grain overlay, and (c) the final
// screenshot at device resolution. Also reports the canvas backing-store scale vs the screen.
// usage: node qa/sun-grain.mjs [--url=…] [--dump=<dir>]     (needs the dev server: it imports TS modules)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const dump = process.argv.find((a) => a.startsWith('--dump='))?.slice(7)
const PROFILES = [
  { name: 'iPhone-class 393×852 @3x', width: 393, height: 852, dpr: 3 },
  { name: 'phone 390×844 @2x', width: 390, height: 844, dpr: 2 },
  { name: 'desktop 1440×900 @1x', width: 1440, height: 900, dpr: 1 },
  { name: 'retina laptop 1440×900 @2x', width: 1440, height: 900, dpr: 2 },
]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let worst = 0
for (const pr of PROFILES) {
  const mobile = pr.width < 700
  const page = await browser.newPage({ viewport: { width: pr.width, height: pr.height }, deviceScaleFactor: pr.dpr, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.addStyleTag({ content: 'main,.nav,.skip-link{visibility:hidden!important}' })
  const m = await page.evaluate(async () => {
    const storeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/world\/store\.ts/.test(n))
    const { worldStore } = await import(storeUrl)
    const { drawSky } = await import('/src/world/render/sky.ts')
    const { createGrainTile } = await import('/src/world/render/grain.ts')
    worldStore.setProgress(1)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))))
    const sky = document.querySelectorAll('canvas')[0]
    const state = worldStore.get()
    const W = sky.width, H = sky.height
    const bdpr = W / innerWidth
    const view = { w: W / bdpr, h: H / bdpr, dpr: bdpr, k: H / bdpr / 900, widthD: ((W / bdpr) * 900) / (H / bdpr), horizonPx: (H / bdpr) * 0.64 }
    const mk = (withGrain) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const g = c.getContext('2d', { alpha: false, willReadFrequently: true })
      drawSky(g, state, view, withGrain ? g.createPattern(createGrainTile(), 'repeat') : null)
      return g
    }
    const sx = Math.round(state.sun.x * W), sy = Math.round(state.sun.y * H)
    const r = Math.round(H * 0.027 * 1.5 * 0.95) // inside the disc (sky.ts: r = h*0.027*(1+0.5*near)), with margin
    // "noise" = std-dev of (pixel − local 5×5 mean) in luminance → ignores smooth gradients, keeps speckle
    const noise = (g, cx, cy, rad, inner = 0) => {
      const x0 = cx - rad, y0 = cy - rad, w = 2 * rad + 1
      const d = g.getImageData(x0, y0, w, w).data
      const L = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      let s = 0, n = 0
      for (let y = 2; y < w - 2; y++) for (let x = 2; x < w - 2; x++) {
        const dist = Math.hypot(x - rad, y - rad)
        if (dist > rad - 3 || dist < inner) continue
        let m = 0
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) m += L(((y + j) * w + (x + i)) * 4)
        const e = L((y * w + x) * 4) - m / 25
        s += e * e; n++
      }
      return Math.sqrt(s / n)
    }
    const withG = mk(true), noG = mk(false)
    const haloR = Math.round(H * 0.12)
    return {
      backing: [W, H], cssToBacking: bdpr, discR: r,
      disc: { grain: noise(withG, sx, sy, r), none: noise(noG, sx, sy, r) },
      halo: { grain: noise(withG, sx, sy, haloR, r * 1.6), none: noise(noG, sx, sy, haloR, r * 1.6) },
      sun: { x: state.sun.x, y: state.sun.y },
    }
  })
  const shot = await page.screenshot()
  if (dump) writeFileSync(`${dump}/sungrain-${pr.width}x${pr.height}@${pr.dpr}.png`, shot)
  console.log(`${pr.name.padEnd(30)} backing ${m.backing.join('×')} (${m.cssToBacking}× css; screen is ${pr.dpr}× → upscaled ${(pr.dpr / m.cssToBacking).toFixed(2)}×)   noise σ  disc: ${m.disc.grain.toFixed(2)} (no grain ${m.disc.none.toFixed(2)})   halo: ${m.halo.grain.toFixed(2)} (no grain ${m.halo.none.toFixed(2)})`)
  worst = Math.max(worst, m.disc.grain)
  await page.close()
}
await browser.close()
if (process.argv.includes('--max')) process.exit(worst > +process.argv.find((a) => a.startsWith('--max=')).slice(6) ? 1 : 0)
