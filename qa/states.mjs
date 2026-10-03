// Captures interaction states that the journey sweep doesn't: keyboard focus, open mobile menu, reduced motion.
import { chromium } from 'playwright-core'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const url = 'http://localhost:4173/'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => scrollTo({ top: document.getElementById('projects').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await page.keyboard.press('Tab') // skip link
  for (let i = 0; i < 11; i++) await page.keyboard.press('Tab')
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'qa/shots/state-focus-carousel.png' })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Tab')
  await page.waitForTimeout(700)
  await page.screenshot({ path: 'qa/shots/state-focus-link.png' })
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => scrollTo({ top: document.getElementById('research').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await page.tap('.nav__menu')
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'qa/shots/state-mobile-menu.png' })
  await ctx.close()
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => scrollTo({ top: document.getElementById('extracurricular').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'qa/shots/state-reduced-motion.png' })
  await ctx.close()
}
await browser.close()
