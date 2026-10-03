// Lighting-continuity test. Drives world progress in tiny steps and measures how much each terrain object's
// pixels change from one step to the next. A discrete lighting flip shows up as a single-step spike orders of
// magnitude above its neighbours; continuous lighting yields a smooth, small, steady rate of change.
// usage: node qa/lighting.mjs [--url=http://localhost:5173/]   (needs the dev server: it imports TS modules)
import { chromium } from 'playwright-core'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

const result = await page.evaluate(async () => {
  // Import the *same* module instance the app is subscribed to (Vite may serve it with an HMR ?t= suffix).
  const storeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/world\/store\.ts/.test(n)) ?? '/src/world/store.ts'
  const { worldStore } = await import(storeUrl)
  const { buildScene } = await import('/src/world/render/scene.ts')
  const { drawLand } = await import('/src/world/render/land.ts')
  const { computeWorld } = await import('/src/world/state.ts')
  const land = document.querySelectorAll('canvas')[2]
  const dpr = land.width / 1440
  const k = land.height / dpr / 900
  const scene = buildScene(1440 / k)
  const regionsFor = (W, H, D) => {
    const r = scene.mesas.map((m, i) => ({
      name: `mesa${i}@${Math.round(m.cx * k)}`,
      x: Math.max(0, Math.round((m.cx - m.width * 0.55) * k * D)),
      y: Math.round((m.base - m.height - 6) * k * D),
      w: Math.round(m.width * 1.1 * k * D),
      h: Math.round((m.height + 8) * k * D),
    }))
    r.push({ name: 'ground', x: 0, y: Math.round(0.68 * H), w: W, h: Math.round(0.3 * H) })
    return r
  }
  // Tonal field of a region: mean colour of BLOCK×BLOCK cells over opaque pixels. Thin edges that move sub-pixel average
  // away; a gradient being swapped, or a surface flipping from lit to shaded, does not.
  const BLOCK = 12
  const field = (ctx, r, W) => {
    const w = Math.min(r.w, W - r.x)
    const d = ctx.getImageData(r.x, r.y, w, r.h).data
    const cols = Math.ceil(w / BLOCK)
    const rows = Math.ceil(r.h / BLOCK)
    const f = new Float32Array(cols * rows * 4)
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        if (d[i + 3] < 200) continue
        const c = ((y / BLOCK) | 0) * cols + ((x / BLOCK) | 0)
        f[c * 4] += d[i]; f[c * 4 + 1] += d[i + 1]; f[c * 4 + 2] += d[i + 2]; f[c * 4 + 3]++
      }
    for (let c = 0; c < cols * rows; c++) if (f[c * 4 + 3] > 0) for (let q = 0; q < 3; q++) f[c * 4 + q] /= f[c * 4 + 3]
    return f
  }
  const delta = (a, b) => {
    let sum = 0, n = 0
    for (let c = 0; c < a.length; c += 4) {
      if (a[c + 3] < 40 || b[c + 3] < 40) continue
      sum += (Math.abs(a[c] - b[c]) + Math.abs(a[c + 1] - b[c + 1]) + Math.abs(a[c + 2] - b[c + 2])) / 3
      n++
    }
    return n ? sum / n : 0
  }
  const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

  // ── Phase A: the real pipeline. Sweep world progress through the whole night → dawn journey. ──
  const ctxA = land.getContext('2d', { willReadFrequently: true })
  const regionsA = regionsFor(land.width, land.height, dpr)
  const STEPS = 480
  const outA = Object.fromEntries(regionsA.map((r) => [r.name, []]))
  worldStore.setProgress(0.02)
  await frame()
  let prev = regionsA.map((r) => field(ctxA, r, land.width))
  for (let i = 1; i <= STEPS; i++) {
    worldStore.setProgress(0.02 + (0.96 * i) / STEPS)
    await frame()
    const cur = regionsA.map((r) => field(ctxA, r, land.width))
    regionsA.forEach((r, ri) => outA[r.name].push(delta(prev[ri], cur[ri])))
    prev = cur
  }

  // ── Phase B: stress. Hold every other variable fixed and sweep the sun's x across the ENTIRE scene, past the
  // centre of every formation. This is the case the original bug lived in, regardless of where the sun's real path goes. ──
  const c2 = document.createElement('canvas')
  c2.width = 1440
  c2.height = 900
  const ctxB = c2.getContext('2d', { willReadFrequently: true })
  const view = { w: 1440, h: 900, dpr: 1, k: 1, widthD: 1440, horizonPx: 576 }
  const sceneB = buildScene(1440)
  const base = computeWorld(0.9) // sunrise, direct light on
  const regionsB = sceneB.mesas.map((m, i) => ({
    name: `mesa${i}@${Math.round(m.cx)}`,
    x: Math.max(0, Math.round(m.cx - m.width * 0.55)),
    y: Math.round(m.base - m.height - 6),
    w: Math.round(m.width * 1.1),
    h: Math.round(m.height + 8),
  }))
  regionsB.push({ name: 'ground', x: 0, y: Math.round(0.68 * 900), w: 1440, h: Math.round(0.3 * 900) })
  const outB = Object.fromEntries(regionsB.map((r) => [r.name, []]))
  const SB = 480
  const paint = (x) => {
    drawLand(ctxB, sceneB, { ...base, sun: { ...base.sun, x } }, view, null)
    return regionsB.map((r) => field(ctxB, r, 1440))
  }
  let pb = paint(0.03)
  for (let i = 1; i <= SB; i++) {
    const cb = paint(0.03 + (0.94 * i) / SB)
    regionsB.forEach((r, ri) => outB[r.name].push(delta(pb[ri], cb[ri])))
    pb = cb
  }
  return { A: { out: outA, p0: 0.02, p1: 0.98, STEPS }, B: { out: outB, p0: 0.03, p1: 0.97, STEPS: SB } }
})

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]
let failed = 0
const analyse = (label, phase, unit) => {
  console.log(`\n${label}`)
  if (!Object.values(phase.out).some((d) => Math.max(...d) > 0.01)) {
    console.log('✗ harness error: nothing changed, so this test proves nothing')
    process.exit(2)
  }
  for (const [name, deltas] of Object.entries(phase.out)) {
    const med = median(deltas)
    const max = Math.max(...deltas)
    let worstRatio = 0
    let worstAt = 0
    deltas.forEach((d, i) => {
      if (i < 5) return // first frames after the initial paint are still settling
      const nb = deltas.slice(Math.max(0, i - 6), i).concat(deltas.slice(i + 1, i + 7))
      const local = Math.max(median(nb), 0.08)
      if (d / local > worstRatio) {
        worstRatio = d / local
        worstAt = i
      }
    })
    const at = (phase.p0 + ((phase.p1 - phase.p0) * (worstAt + 1)) / phase.STEPS).toFixed(3)
    // A flip is abrupt (vs neighbours) AND large: fixed code peaks near 0.7; the original bug measured 2.3.
    const ok = !(worstRatio >= 4 && max >= 1.2)
    if (!ok) failed++
    console.log(`${ok ? '✓' : '✗'} ${name.padEnd(14)} median Δ/step ${med.toFixed(3)}  max ${max.toFixed(2)}  worst spike vs neighbours ${worstRatio.toFixed(1)}× @${unit}=${at}`)
  }
}
analyse('A · progress sweep, 0.02 → 0.98 (the real scroll → world pipeline)', result.A, 'p')
analyse('B · stress: sun x swept 0.03 → 0.97 across every formation, all else fixed', result.B, 'sun.x')
await browser.close()
console.log(failed ? `\n${failed} region(s) show a lighting discontinuity` : '\nlighting changes continuously in every region, for any sun position')
process.exit(failed ? 1 : 0)
