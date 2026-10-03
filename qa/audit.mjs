// Accessibility + contrast + performance + reduced-motion audit.
// usage: node qa/audit.mjs [--url=http://localhost:4173/]
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:4173/').slice(6)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const browser = await chromium.launch({ executablePath: CHROME, headless: true })

async function open(opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  return { context, page }
}
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ── 1. axe-core at several points of the journey ─────────────────────────
{
  const { context, page } = await open()
  await page.addScriptTag({ content: axeSource })
  for (const id of ['top', 'projects', 'research', 'education', 'skills', 'contact']) {
    await page.evaluate((id) => scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + scrollY, behavior: 'instant' }), id)
    await page.waitForTimeout(500)
    const r = await page.evaluate(async () => {
      const res = await axe.run(document, { rules: { 'color-contrast': { enabled: true } } })
      return { violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].target.join(' '), help: v.help })), incomplete: res.incomplete.map((v) => v.id) }
    })
    console.log(`axe @${id}: ${r.violations.length} violations`, r.violations.length ? JSON.stringify(r.violations, null, 1) : '', r.incomplete.length ? `(needs review: ${[...new Set(r.incomplete)].join(', ')})` : '')
  }
  await context.close()
}

// ── 2. Real contrast of text over the painted sky ────────────────────────
// Hide the text, screenshot what is *behind* it, and compare to the text colour.
{
  const { context, page } = await open()
  // Resting positions: where the page lands after a nav click or when the user pauses on a section.
  const sectionTops = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)))
  const sel = ['.hero__name', '.hero__tagline', '.hero__intro', '.section__title', '.carousel__count', '.carousel__btn', '.contact__title', '.contact__blurb', '.contact__note', '.contact__label', '.nav__link', '.hero__cue', '.contact__footer']
  const worst = {}
  const transit = {}
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  // …plus the midpoint between each pair of sections, where a heading can end up over the sun or horizon glow.
  const anchors = sectionTops.flatMap((t, i) => (i < sectionTops.length - 1 ? [t, Math.round((t + sectionTops[i + 1]) / 2)] : [t]))
  for (const a of anchors) {
    const resting = sectionTops.includes(a)
    const y = Math.min(maxScroll, a)
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y)
    await page.waitForTimeout(400)
    const boxes = await page.evaluate((sel) => {
      const out = []
      for (const s of sel)
        for (const el of document.querySelectorAll(s)) {
          const cs = getComputedStyle(el)
          if (+cs.opacity < 0.15 || +getComputedStyle(el.closest('.hero__cue') ?? el).opacity < 0.15) continue
          // Measure the glyph line boxes, not the (often full-width) block box around them.
          const range = document.createRange()
          range.selectNodeContents(el)
          for (const r of range.getClientRects()) {
            if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue
            out.push({ s, x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - r.left), h: Math.min(r.height, innerHeight - r.top), color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight })
          }
        }
      return out
    }, sel)
    await page.addStyleTag({ content: '.hero__inner *, .hero__cue, .section__head *, .carousel__controls *, .contact__inner *, .contact__footer, .nav__inner * { color: transparent !important; border-color: transparent !important; transition: none !important; } .carousel__btn, .carousel__tick::before, .nav__link::after { visibility: hidden !important }' })
    const shotHidden = await page.screenshot()
    await page.evaluate(() => { for (const s of [...document.querySelectorAll('style')].filter((s) => s.textContent.includes('color: transparent !important'))) s.remove() })
    // decode via canvas in page
    const b64 = shotHidden.toString('base64')
    const lums = await page.evaluate(async ({ b64, boxes }) => {
      const img = new Image()
      img.src = 'data:image/png;base64,' + b64
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const g = c.getContext('2d', { willReadFrequently: true })
      g.drawImage(img, 0, 0)
      return boxes.map((b) => {
        const d = g.getImageData(Math.floor(b.x), Math.floor(b.y), Math.max(1, Math.floor(b.w)), Math.max(1, Math.floor(b.h))).data
        // sample the lightest and darkest 5th percentile of luminance → worst-case backdrop for light text
        const px = []
        for (let i = 0; i < d.length; i += 4 * 7) px.push([d[i], d[i + 1], d[i + 2]])
        return px
      })
    }, { b64, boxes })
    boxes.forEach((b, i) => {
      const m = b.color.match(/[\d.]+/g).map(Number)
      const fg = m.slice(0, 3)
      const alpha = m[3] ?? 1
      const px = lums[i]
      if (!px.length) return
      // brightest 90th percentile backdrop is the worst case for light text
      const sorted = px.map((p) => lum(p)).sort((a, b) => a - b)
      const p90 = sorted[Math.floor(sorted.length * 0.9)]
      const bg = px.find((p) => Math.abs(lum(p) - p90) < 0.01) ?? px[0]
      const eff = fg.map((c, k) => c * alpha + bg[k] * (1 - alpha))
      const r = ratio(eff, bg)
      const key = b.s
      const large = b.size >= 24 || (b.size >= 18.66 && b.weight >= 700)
      const need = large ? 3 : 4.5
      const bucket = resting ? worst : transit
      if (!bucket[key] || r - need < bucket[key].margin) bucket[key] = { ratio: +r.toFixed(2), need, margin: r - need, at: `scrollY≈${y}`, size: b.size }
    })
  }
  let bad = 0
  for (const [k, v] of Object.entries(worst)) {
    const ok = v.margin >= 0
    if (!ok) bad++
    console.log(`${ok ? '✓' : '✗'} contrast ${k.padEnd(18)} worst ${v.ratio}:1 (need ${v.need}) ${v.at} ${v.size}px`)
  }
  console.log(bad ? `${bad} contrast problems at resting positions` : 'all text meets WCAG AA at every resting position')
  // Between sections text is moving through the scene (e.g. a heading crossing the horizon glow). Reported, not gated.
  const slow = Object.entries(transit).filter(([, v]) => v.margin < 0)
  console.log(slow.length ? 'in transit (informational): ' + slow.map(([k, v]) => `${k} ${v.ratio}:1 @${v.at}`).join(' · ') : 'in transit: all text also meets AA')
  await context.close()
}

// ── 4. Performance while scrolling the whole page ────────────────────────
for (const [label, opts] of [['desktop 1440×900', {}], ['mobile 390×844 @2x', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }]]) {
  const { context, page } = await open(opts)
  const stats = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const max = document.documentElement.scrollHeight - innerHeight
        const frames = []
        let last = performance.now()
        const start = last
        const dur = 6000
        const step = (t) => {
          frames.push(t - last)
          last = t
          const p = Math.min(1, (t - start) / dur)
          scrollTo(0, p * max)
          if (p < 1) requestAnimationFrame(step)
          else {
            frames.sort((a, b) => a - b)
            const q = (x) => frames[Math.min(frames.length - 1, Math.floor(frames.length * x))]
            resolve({ frames: frames.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), worst: frames[frames.length - 1], over33: frames.filter((f) => f > 33.4).length })
          }
        }
        requestAnimationFrame(step)
      }),
  )
  console.log(`perf ${label}: frames=${stats.frames} p50=${stats.p50.toFixed(1)}ms p95=${stats.p95.toFixed(1)}ms p99=${stats.p99.toFixed(1)}ms worst=${stats.worst.toFixed(1)}ms >33ms=${stats.over33} (headless/software rendering — pessimistic)`)
  await context.close()
}

// ── 5. Reduced motion ────────────────────────────────────────────────────
{
  const { context, page } = await open({ reducedMotion: 'reduce' })
  await page.evaluate(() => scrollTo({ top: document.getElementById('projects').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(400)
  await page.focus('#projects .carousel__viewport')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(60)
  const x = await page.$eval('#projects .carousel__slot:nth-child(2) .card', (c) => new DOMMatrix(getComputedStyle(c).transform).e)
  console.log(`${Math.abs(x) < 1 ? '✓' : '✗'} reduced motion: carousel snaps (centre card x=${x.toFixed(1)} 60ms after key)`)
  await page.click('.nav__link[href="#research"]')
  await page.waitForTimeout(150)
  const y = await page.evaluate(() => scrollY)
  const target = await page.evaluate(() => document.getElementById('research').getBoundingClientRect().top + scrollY)
  console.log(`${Math.abs(y - target) < 3 ? '✓' : '✗'} reduced motion: nav jumps without smooth-scroll (scrollY=${Math.round(y)} target=${Math.round(target)})`)
  const anim = await page.$eval('.hero__cue-arrow', (e) => getComputedStyle(e).animationDuration)
  console.log(`${parseFloat(anim) < 0.01 ? '✓' : '✗'} reduced motion: decorative CSS animation disabled (duration ${anim})`)
  await context.close()
}
await browser.close()
