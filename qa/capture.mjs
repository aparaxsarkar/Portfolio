// Visual QA: drives the production preview in system Chrome and screenshots key moments of the journey.
// usage: node qa/capture.mjs [WxH,WxH…] [shotName,shotName…] [--url=http://localhost:4173] [--reduce] [--touch]
import { chromium } from 'playwright-core'

const args = process.argv.slice(2)
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')))
const pos = args.filter((a) => !a.startsWith('--'))
const sizes = (pos[0] ?? '1440x900').split(',')
const only = pos[1] ? pos[1].split(',') : null
const url = flags.url ?? 'http://localhost:4173/'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errors = []

for (const size of sizes) {
  const [width, height] = size.split('x').map(Number)
  const mobile = width < 700
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1,
    hasTouch: mobile || 'touch' in flags,
    isMobile: mobile,
    reducedMotion: 'reduce' in flags ? 'reduce' : 'no-preference',
  })
  const page = await context.newPage()
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(`[${size}] ${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`[${size}] pageerror: ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)

  const tops = await page.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('main > section')].map((s) => [s.id, s.getBoundingClientRect().top + scrollY])),
  )
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const ids = Object.keys(tops)
  const shots = [
    ['hero', 0],
    ['hero-to-exp', tops.experiences * 0.5],
    ...ids.slice(1).map((id) => [id, Math.min(tops[id], maxScroll)]),
    ['exp-to-projects', (tops.experiences + tops.projects) / 2],
    ['research-to-education', (tops.research + tops.education) / 2],
    ['education-to-achievements', (tops.education + tops.achievements) / 2],
    ['achievements-to-extra', (tops.achievements + tops.extracurricular) / 2],
  ]
  for (const [name, y] of shots) {
    if (only && !only.includes(name)) continue
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y)
    await page.waitForTimeout(450)
    await page.screenshot({ path: `qa/shots/${size}-${name}${'reduce' in flags ? '-reduced' : ''}.png` })
  }
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }))
  console.log(size, 'maxScroll', maxScroll, 'overflow', overflow, overflow.scrollW > overflow.clientW ? '⚠ HORIZONTAL OVERFLOW' : 'ok')
  await context.close()
}
await browser.close()
console.log(errors.length ? 'CONSOLE:\n' + errors.join('\n') : 'no console errors/warnings')
