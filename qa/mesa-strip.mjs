// Renders the sky+stars+land composite for a crop around a chosen formation at several progress values, so the
// lighting on it can be inspected at intermediate states — and checks forward→back reproduces the same pixels.
// usage: node qa/mesa-strip.mjs <outDir> [mesaIndex=1]    (needs the dev server)
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const out = process.argv[2]
const mesaIndex = +(process.argv[3] ?? 1)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
const res = await page.evaluate(async (mesaIndex) => {
  const storeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/src\/world\/store\.ts/.test(n))
  const { worldStore } = await import(storeUrl)
  const { buildScene } = await import('/src/world/render/scene.ts')
  const [sky, stars, land] = document.querySelectorAll('canvas')
  const dpr = land.width / 1440
  const k = land.height / dpr / 900
  const scene = buildScene(1440 / k)
  const m = scene.mesas[mesaIndex]
  const crop = { x: Math.max(0, (m.cx - m.width * 0.75) * k * dpr), y: (m.base - m.height - 70) * k * dpr, w: m.width * 1.5 * k * dpr, h: (m.height + 150) * k * dpr }
  const fr = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const sunCross = (m.cx / 1440 - 0.25) / 0.5 // progress at which the sun's x equals the formation's centre
  const snap = async (p) => {
    worldStore.setProgress(p)
    await fr()
    const c = document.createElement('canvas')
    c.width = crop.w
    c.height = crop.h
    const g = c.getContext('2d', { willReadFrequently: true })
    for (const layer of [sky, stars, land]) g.drawImage(layer, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
    return c
  }
  const ps = [-0.09, -0.06, -0.03, -0.01, 0, 0.01, 0.03, 0.06, 0.09].map((d) => +(sunCross + d).toFixed(4))
  const frames = []
  for (const p of ps) frames.push({ p, url: (await snap(p)).toDataURL() })
  // forward → intermediate → backward → same intermediate
  const mid = ps[5]
  const a = (await snap(mid)).getContext('2d').getImageData(0, 0, crop.w, crop.h).data
  await snap(ps[8])
  await snap(ps[2])
  const b = (await snap(mid)).getContext('2d').getImageData(0, 0, crop.w, crop.h).data
  let diff = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
  return { frames, sunCross, identical: diff === 0, diff }
}, mesaIndex)
res.frames.forEach((f, i) => writeFileSync(`${out}/strip-${i}-p${f.p}.png`, Buffer.from(f.url.split(',')[1], 'base64')))
console.log('sun crosses formation centre at p =', res.sunCross.toFixed(3), '| forward→back identical:', res.identical ? 'yes' : `NO (${res.diff} bytes differ)`)
await browser.close()
