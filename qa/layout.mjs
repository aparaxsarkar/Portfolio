// Measures the carousel-section layout at each target viewport: title, centre card, side cards, controls.
// usage: node qa/layout.mjs [--url=…] [--json=<file>]
import { chromium } from 'playwright-core'
import { writeFileSync } from 'node:fs'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const jsonOut = process.argv.find((a) => a.startsWith('--json='))?.slice(7)
const SIZES = [[390, 844], [430, 932], [1280, 800], [1440, 900], [1920, 1080]]
const SECTIONS = ['experiences', 'projects', 'research']
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const out = {}
for (const [width, height] of SIZES) {
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  out[`${width}x${height}`] = {}
  for (const id of SECTIONS) {
    await page.evaluate((id) => scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + scrollY, behavior: 'instant' }), id)
    await page.waitForTimeout(500)
    out[`${width}x${height}`][id] = await page.evaluate((id) => {
      const sec = document.getElementById(id)
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) } }
      const cards = [...sec.querySelectorAll('.card')]
      const visible = cards.filter((c) => getComputedStyle(c).visibility !== 'hidden')
      const centre = cards.find((c) => c.dataset.active === 'true') ?? cards[0]
      const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))
      return {
        title: r(sec.querySelector('.section__title')),
        centre: r(centre),
        centreW: centre.offsetWidth, centreH: centre.offsetHeight, // layout size (unscaled)
        controls: r(sec.querySelector('.carousel__controls')),
        visibleEdges: { left: Math.min(...visible.map((c) => c.getBoundingClientRect().left)), right: Math.max(...visible.map((c) => c.getBoundingClientRect().right)) },
        summaryLines: cards.map((c) => lines(c.querySelector('.card__desc'))),
        truncated: cards.filter((c) => { const d = c.querySelector('.card__desc'); return d.scrollHeight > d.clientHeight + 1 }).length,
        overlapsLink: cards.filter((c) => { const d = c.querySelector('.card__desc').getBoundingClientRect(); const l = c.querySelector('.card__link'); return l && d.bottom > l.getBoundingClientRect().top + 1 }).length,
        titleFont: getComputedStyle(centre.querySelector('.card__title')).fontSize,
        descFont: getComputedStyle(centre.querySelector('.card__desc')).fontSize,
        overflowX: document.documentElement.scrollWidth > innerWidth,
        eyebrow: !!sec.querySelector('.section__eyebrow'),
        spec: !!sec.querySelector('.spec'),
      }
    }, id)
  }
  await page.close()
}
await browser.close()
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1))
for (const [vp, secs] of Object.entries(out)) for (const [id, m] of Object.entries(secs)) console.log(`${vp.padEnd(9)} ${id.padEnd(11)} card ${m.centreW}×${m.centreH}  title y=${m.title.y}  card y=${m.centre.y}..${m.centre.b}  controls ${m.controls ? m.controls.y + '..' + m.controls.b : '-'}  lines ${m.summaryLines.join(',')} truncated ${m.truncated} overlap ${m.overlapsLink}  edges ${m.visibleEdges.left.toFixed(0)}..${m.visibleEdges.right.toFixed(0)}`)
