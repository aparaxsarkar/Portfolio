// No card ever clips its content, and every card in a section is the same size (the tallest card's, never below the
// standard tile). Sweeps phone → wide desktop, including the awkward tablet and very narrow widths.
// usage: node qa/cards.mjs [--url=…]
import { chromium } from 'playwright-core'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const SIZES = [[320, 640], [360, 740], [390, 844], [430, 932], [600, 900], [720, 900], [721, 900], [768, 1024], [900, 800], [1024, 768], [1100, 800], [1200, 800], [1280, 720], [1440, 900], [1920, 1080], [2560, 1300]]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let failed = 0
for (const [width, height] of SIZES) {
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  const res = await page.evaluate(() => {
    const out = []
    for (const sec of document.querySelectorAll('section')) {
      const cards = [...sec.querySelectorAll('.card')]
      if (!cards.length) continue
      // Layout sizes (offset*) ignore the focus scale transform.
      const heights = cards.map((c) => c.offsetHeight)
      const std = parseFloat(getComputedStyle(cards[0]).getPropertyValue('--card-h')) || 0
      const clipped = []
      for (const c of cards) {
        const padB = parseFloat(getComputedStyle(c).paddingBottom)
        for (const el of c.querySelectorAll('.card__tags, .card__title, .card__desc, .card__meta, .card__link')) {
          // Only boxes that actually clip (overflow ≠ visible) can hide text; visible overflow is just glyph ink beyond the line box.
          const cs = getComputedStyle(el)
          if (cs.overflow !== 'visible' && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)) clipped.push(`${el.className} scroll`)
          if (el.scrollWidth > el.clientWidth + 1) clipped.push(`${el.className} wider than its box`)
          if (cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none')) clipped.push(`${el.className} clamp/ellipsis`)
          if (el.offsetTop + el.offsetHeight > c.clientHeight - padB + 1) clipped.push(`${el.className} past card bottom`)
        }
        if (getComputedStyle(c).overflow !== 'visible' && (c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)) clipped.push('card scroll')
      }
      out.push({ id: sec.id, n: cards.length, h: Math.round(Math.max(...heights)), same: Math.max(...heights) - Math.min(...heights) < 0.5, clipped, std })
    }
    return out
  })
  for (const r of res) {
    const ok = r.same && !r.clipped.length
    if (!ok) failed++
    if (!ok || process.argv.includes('--verbose')) console.log(`${ok ? '✓' : '✗'} ${width}×${height} ${r.id.padEnd(15)} ${r.n} cards, height ${r.h}px${r.same ? '' : ' UNEQUAL'}${r.clipped.length ? ' CLIPPED ' + [...new Set(r.clipped)].join(', ') : ''}`)
  }
  await page.close()
}
await browser.close()
console.log(failed ? `\n${failed} problems` : '\nno card clips anything and every section\'s cards are one size, at every viewport')
process.exit(failed ? 1 : 0)
