// Vertical rhythm between sections: from the last visible element of a section (carousel controls, the education
// cards, the skills panel) to the next section's title. These should all be the same at a given viewport.
// usage: node qa/rhythm.mjs [--url=…]
import { chromium } from 'playwright-core'

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const SIZES = [[390, 844], [430, 932], [1280, 800], [1440, 900], [1920, 1080]]
const ORDER = ['experiences', 'projects', 'research', 'education', 'achievements', 'extracurricular', 'skills', 'contact']
// skills → contact is reported but not compared: the Contact heading is deliberately seated higher (see --contact-offset).
const COMPARED = ORDER.length - 2
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
let failed = 0
for (const [width, height] of SIZES) {
  const mobile = width < 700
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  const gaps = await page.evaluate((ORDER) => {
    const abs = (el) => el.getBoundingClientRect().top + scrollY
    const bottomOf = (id) => {
      const sec = document.getElementById(id)
      const controls = sec.querySelector('.carousel__controls')
      if (controls) return controls.getBoundingClientRect().bottom + scrollY
      const cards = [...sec.querySelectorAll('.card')]
      if (cards.length) return Math.max(...cards.map((c) => c.getBoundingClientRect().bottom + scrollY))
      const sk = sec.querySelector('.skills')
      return sk ? sk.getBoundingClientRect().bottom + scrollY : null
    }
    const titleOf = (id) => abs(document.getElementById(id).querySelector('.section__title, .contact__title'))
    return ORDER.slice(0, -1).map((id, i) => ({ pair: `${id} → ${ORDER[i + 1]}`, gap: +(titleOf(ORDER[i + 1]) - bottomOf(id)).toFixed(1) }))
  }, ORDER)
  // At a section's resting scroll position, the next section's title must still be below the fold.
  const peeks = await page.evaluate((ORDER) => {
    const out = []
    for (let i = 0; i < ORDER.length - 1; i++) {
      const sec = document.getElementById(ORDER[i])
      scrollTo({ top: sec.getBoundingClientRect().top + scrollY, behavior: 'instant' })
      const t = document.getElementById(ORDER[i + 1]).querySelector('.section__title, .contact__title').getBoundingClientRect().top
      if (t < innerHeight) out.push(`${ORDER[i]}→${ORDER[i + 1]} (title at ${Math.round(t)} < ${innerHeight})`)
    }
    return out
  }, ORDER)
  if (peeks.length) { failed++; console.log('✗ next heading peeks into view at rest:', peeks.join(', ')) }
  const vals = gaps.slice(0, COMPARED).map((g) => g.gap)
  const spread = Math.max(...vals) - Math.min(...vals)
  const ok = spread <= 3
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${String(width).padStart(4)}×${String(height).padEnd(4)} spread ${spread.toFixed(1)}px   ${gaps.map((g) => g.gap).join('  ')}`)
  if (!ok && process.argv.includes('--verbose')) console.log(gaps.map((g) => `      ${g.pair.padEnd(34)} ${g.gap}`).join('\n'))
  await page.close()
}
await browser.close()
console.log(failed ? `\n${failed} viewport(s) have uneven section spacing` : '\nsection spacing is consistent at every viewport')
process.exit(failed ? 1 : 0)
