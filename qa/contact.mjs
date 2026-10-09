// Contrast of the Contact text where it actually rests (the end of the page), at phone, tablet and desktop sizes.
// The closing paragraph and links land over different terrain at each size (sky, mesa, sunlit sand, the sunrise
// glow), so one viewport is not enough. Method as in audit.mjs: hide the text, photograph what is behind each line,
// and compare the text colour with the lightest 10% of that backdrop.
// usage: node qa/contact.mjs [--url=http://localhost:5173/]
import { chromium } from 'playwright-core'
import { SUN_PATH } from '../src/config/world.ts'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const SIZES = [[360, 740], [375, 667], [390, 844], [414, 896], [430, 932], [600, 900], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]
// The closing paragraph on a phone has no shade behind it (owner's choice, 2026-10-09). Its last lines can land over the
// pale horizon and measure below AA there; reported as a warning rather than a failure.
const WARN_ONLY = (width, key) => width <= 720 && key === '.contact__blurb'
const SEL = ['.contact__title', '.contact__blurb', '.contact__label', '.contact__note', '.contact__footer']
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let failed = 0
let warned = 0
for (const [width, height] of SIZES) {
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(900)
  const boxes = await page.evaluate((SEL) => {
    const out = []
    for (const s of SEL)
      for (const el of document.querySelectorAll(s)) {
        const cs = getComputedStyle(el)
        const range = document.createRange()
        range.selectNodeContents(el)
        for (const r of range.getClientRects()) {
          if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue
          out.push({ s, x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - r.left), h: Math.min(r.height, innerHeight - r.top), color: cs.color, size: parseFloat(cs.fontSize) })
        }
      }
    return out
  }, SEL)
  // The closing sunrise is the event of the page: when the section fits the screen, the links plate must not cover the sun.
  const sun = await page.evaluate(({ x, y }) => {
    const fits = document.getElementById('contact').offsetHeight <= innerHeight
    const r = document.querySelector('.contact__links').getBoundingClientRect()
    const cx = x * innerWidth
    const cy = y * innerHeight
    const dx = Math.max(r.left - cx, 0, cx - r.right)
    const dy = Math.max(r.top - cy, 0, cy - r.bottom)
    return { fits, distance: Math.hypot(dx, dy), radius: innerHeight * 0.041 }
  }, { x: SUN_PATH.x1, y: SUN_PATH.yEnd })
  // The disc is h·0.027·1.5 across at the end (sky.ts); keep a small margin beyond it.
  // Space between the paragraph and the links plate is never tighter than card → carousel controls in the other sections.
  const gap = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;width:calc(var(--carousel-pad) + 0.25rem)'
    document.body.append(probe)
    const want = probe.getBoundingClientRect().width
    probe.remove()
    return {
      actual: document.querySelector('.contact__links').getBoundingClientRect().top - document.querySelector('.contact__blurb').getBoundingClientRect().bottom,
      want,
    }
  })
  const gapTight = gap.actual < gap.want - 0.5
  if (gapTight) failed++
  const sunBlocked = sun.fits && sun.distance < sun.radius + 8
  if (sunBlocked) failed++
  await page.addStyleTag({ content: '.contact__inner *, .contact__footer { color: transparent !important; border-color: transparent !important; transition: none !important }' })
  const shot = (await page.screenshot()).toString('base64')
  const px = await page.evaluate(async ({ b64, boxes }) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0)
    const k = img.width / innerWidth
    return boxes.map((b) => {
      const d = g.getImageData(Math.floor(b.x * k), Math.floor(b.y * k), Math.max(1, Math.floor(b.w * k)), Math.max(1, Math.floor(b.h * k))).data
      const out = []
      for (let i = 0; i < d.length; i += 28) out.push([d[i], d[i + 1], d[i + 2]])
      return out
    })
  }, { b64: shot, boxes })
  const worst = {}
  boxes.forEach((b, i) => {
    const fg = b.color.match(/[\d.]+/g).map(Number).slice(0, 3)
    const sorted = px[i].map(lum).sort((a, c) => a - c)
    const p90 = sorted[Math.floor(sorted.length * 0.9)]
    const bg = px[i].find((q) => Math.abs(lum(q) - p90) < 0.01) ?? px[i][0]
    const r = ratio(fg, bg)
    const need = b.size >= 24 ? 3 : 4.5
    if (!worst[b.s] || r - need < worst[b.s].margin) worst[b.s] = { r: +r.toFixed(2), need, margin: r - need }
  })
  const below = Object.entries(worst).filter(([, v]) => v.margin < 0)
  const warn = below.filter(([k]) => WARN_ONLY(width, k))
  const bad = below.filter(([k]) => !WARN_ONLY(width, k))
  failed += bad.length
  warned += warn.length
  const summary = Object.entries(worst).map(([k, v]) => `${k.replace('.contact__', '')} ${v.r}`).join('  ')
  console.log(`${bad.length ? '✗' : warn.length ? '⚠' : '✓'} ${width}×${height}  ${summary}${bad.length ? `   BELOW AA: ${bad.map(([k, v]) => `${k} ${v.r}<${v.need}`).join(', ')}` : ''}${warn.length ? `   (paragraph without a shade: ${warn.map(([, v]) => v.r).join(', ')} — accepted)` : ''}${gapTight ? `   PARAGRAPH→LINKS GAP ${gap.actual.toFixed(0)}px < ${gap.want.toFixed(0)}px` : ''}${sunBlocked ? `   SUN COVERED by the links plate (${sun.distance.toFixed(0)}px from its centre, disc radius ≈${sun.radius.toFixed(0)}px)` : ''}${sun.fits ? '' : '   (section taller than the screen)'}`)
  await page.close()
}
await browser.close()
console.log(failed ? `\n${failed} contact text blocks below WCAG AA` : warned ? `\nno failures; ${warned} phone paragraph measurements are below AA by choice (no shade) — see the note at the top of this file` : '\nall Contact text meets WCAG AA at every size')
process.exit(failed ? 1 : 0)
