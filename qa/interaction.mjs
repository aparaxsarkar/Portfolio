// Functional QA against the Vite dev server (so TS modules can be imported for model-level checks).
// usage: node qa/interaction.mjs [--url=http://localhost:5173/]
import { chromium } from 'playwright-core'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// The world state the Projects section had before the timeline was re-based (captured from the old code at p = 0.24).
const PROJECTS_STATE = JSON.parse(readFileSync(new URL('./fixtures/projects-state.json', import.meta.url), 'utf8'))

const url = (process.argv.find((a) => a.startsWith('--url=')) ?? '--url=http://localhost:5173/').slice(6)
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`)
}
const errors = []

async function open(opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts })
  const page = await context.newPage()
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(`${m.type()}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  return { context, page }
}
const top = (page, id) => page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id)
const activeIndex = (page, sel) =>
  page.evaluate((sel) => [...document.querySelectorAll(`${sel} .card`)].findIndex((c) => c.dataset.active === 'true'), sel)

// ── Model-level checks (pure functions of progress) ─────────────────────
{
  const { context, page } = await open()
  const m = await page.evaluate(async (PROJECTS_STATE) => {
    const { computeWorld, sunPosition } = await import('/src/world/state.ts')
    const { ShootingStars } = await import('/src/world/render/stars.ts')
    const samples = Array.from({ length: 201 }, (_, i) => sunPosition(i / 200))
    const rises = samples.every((s, i) => i === 0 || s.y <= samples[i - 1].y + 1e-9) // never sinks
    const worlds = Array.from({ length: 201 }, (_, i) => computeWorld(i / 200))
    const starsFade = worlds.every((w, i) => i === 0 || w.stars.opacity <= worlds[i - 1].stars.opacity + 1e-9)
    const shootFade = worlds.every((w, i) => i === 0 || w.shootingStars.activity <= worlds[i - 1].shootingStars.activity + 1e-9)
    // ── Opening = the old Projects state, field for field (numbers to 1e-6; CSS colours to one 8-bit step). ──
    let openDrift = 0
    const walk = (x, y) => {
      if (typeof x === 'number') openDrift = Math.max(openDrift, Math.abs(x - y))
      else if (x && typeof x === 'object') for (const k of Object.keys(x)) if (k !== 'progress' && k !== 'ui') walk(x[k], y[k])
    }
    const opening = computeWorld(0)
    walk(opening, PROJECTS_STATE)
    const nums = (str) => str.match(/[\d.]+/g).map(Number)
    const uiDrift = Math.max(...Object.keys(PROJECTS_STATE.ui).map((k) => Math.max(...nums(opening.ui[k]).map((v, i) => Math.abs(v - nums(PROJECTS_STATE.ui[k])[i])))))
    // ── No stagnation: everything is still changing right up to s = 1 (compare s = 0.98 → 1.0, and 0.90 → 0.92). ──
    const change = (a, b) => {
      const A = computeWorld(a)
      const B = computeWorld(b)
      let d = 0
      const w = (x, y) => {
        if (typeof x === 'number') d = Math.max(d, Math.abs(x - y))
        else if (x && typeof x === 'object') for (const k of Object.keys(x)) if (k !== 'progress' && k !== 'ui') w(x[k], y[k])
      }
      w(A, B)
      return d
    }
    const moving = {
      sunEnd: sunPosition(1).y - sunPosition(0.98).y,
      sunStart: sunPosition(0.02).y - sunPosition(0).y,
      sun90: sunPosition(0.92).y - sunPosition(0.9).y,
      worldEnd: change(0.98, 1),
      world90: change(0.9, 0.92),
    }
    // Determinism: evaluating the same progress again, after visiting other values, gives the identical world.
    const a = JSON.stringify(computeWorld(0.37))
    computeWorld(0.9)
    const same = a === JSON.stringify(computeWorld(0.37))
    const stars = [0, 0.2, 0.4, 0.55, 0.67, 0.77, 0.85, 0.93, 1].map((p) => [p, +computeWorld(p).stars.opacity.toFixed(3)])
    // Shooting-star cadence at several activity levels (simulated 30,000 s at 30 fps).
    const cadence = {}
    for (const activity of [0.12, 0.55, 1]) {
      const ss = new ShootingStars()
      const view = { w: 1440, h: 900, dpr: 1, k: 1, widthD: 1440, horizonPx: 576 }
      let count = 0
      let seen = 0
      const times = []
      let prevActive = false
      for (let t = 0; t < 30000; t += 1 / 30) {
        ss.update(t, 1 / 30, activity, view)
        const active = ss.active
        if (active && !prevActive) {
          count++
          times.push(t)
        }
        prevActive = active
        seen++
      }
      const gaps = times.slice(1).map((t, i) => t - times[i])
      cadence[activity] = { perMinute: +((count / 30000) * 60).toFixed(2), minGap: +Math.min(...gaps).toFixed(1), maxGap: +Math.max(...gaps).toFixed(1) }
    }
    // Card + panel text vs. its (near-opaque) panel, across the whole journey.
    const { contrast, hexToRgb } = await import('/src/utils/color.ts')
    const parse = (v) => v.match(/[\d.]+/g).map(Number).slice(0, 3)
    let worstCard = { name: '', ratio: 99 }
    for (let i = 0; i <= 100; i++) {
      const ui = computeWorld(i / 100).ui
      const bg = parse(ui['--ui-card-bg'])
      for (const key of ['--ui-card-fg', '--ui-card-muted', '--ui-card-tag']) {
        const r = contrast(parse(ui[key]), bg)
        if (r < worstCard.ratio) worstCard = { name: key + '@' + i / 100, ratio: +r.toFixed(2) }
      }
    }
    void hexToRgb
    const inactive = new ShootingStars()
    for (let t = 0; t < 600; t += 1 / 30) inactive.update(t, 1 / 30, 0, { w: 1440, h: 900, dpr: 1, k: 1, widthD: 1440, horizonPx: 576 })
    return {
      start: sunPosition(0),
      end: sunPosition(1),
      mid: sunPosition(0.5),
      rises,
      starsFade,
      shootFade,
      openDrift,
      uiDrift,
      moving,
      activity0: computeWorld(0).shootingStars.activity,
      activity1: computeWorld(1).shootingStars.activity,
      same,
      stars,
      cadence,
      silent: !inactive.active,
      worstCard,
    }
  }, PROJECTS_STATE)
  const HORIZON = 0.64
  check('opens in the dark: sun is below the horizon at p=0', m.start.y > HORIZON + 0.06, `y=${m.start.y.toFixed(2)}`)
  check('sun is still hidden at mid-journey (night/pre-dawn)', m.mid.y > HORIZON + 0.03, `y=${m.mid.y.toFixed(2)}`)
  check('sun ends clearly above the horizon (visible disc)', m.end.y < HORIZON - 0.03, `y=${m.end.y.toFixed(2)}`)
  check('sun only ever rises (never sinks), x drifts smoothly', m.rises)
  check('opening state equals the former Projects-section state (every field of the fixture)', m.openDrift < 1e-6 && m.uiDrift < 1.01, `max field drift ${m.openDrift.toExponential(1)}, CSS colour drift ${m.uiDrift}`)
  check('sun is already moving at s=0, at s=0.9 and still moving at s=1 (no early stop)', m.moving.sunStart < -0.002 && m.moving.sun90 < -0.002 && m.moving.sunEnd < -0.002, JSON.stringify({ start: +m.moving.sunStart.toFixed(4), at90: +m.moving.sun90.toFixed(4), end: +m.moving.sunEnd.toFixed(4) }))
  check('no end stagnation: sky/terrain/light still change between s=0.98 and 1.0', m.moving.worldEnd > 0.02 && m.moving.world90 > 0.02, JSON.stringify({ end: +m.moving.worldEnd.toFixed(3), at90: +m.moving.world90.toFixed(3) }))
  check('stars fade monotonically from full to none', m.starsFade && m.stars[0][1] === 1 && m.stars[m.stars.length - 1][1] === 0, JSON.stringify(m.stars))
  check('shooting stars start rare-but-present and vanish by dawn', m.shootFade && m.activity0 > 0.3 && m.activity1 === 0, `${m.activity0} → ${m.activity1}`)
  check('world is a pure function of progress', m.same)
  console.log('  shooting-star cadence:', JSON.stringify(m.cadence))
  check('shooting stars are rare (≤ ~3/min at full activity)', m.cadence['1'].perMinute <= 3.2, `${m.cadence['1'].perMinute}/min`)
  check('shooting stars rarer in twilight than deep night', m.cadence['0.12'].perMinute < m.cadence['1'].perMinute)
  check('no shooting stars when activity = 0', m.silent)
  check('card text ≥ 4.5:1 on its panel at every point of the journey', m.worstCard.ratio >= 4.5, `worst ${m.worstCard.ratio}:1 (${m.worstCard.name})`)
  await context.close()
}

const navShape = (page) =>
  page.evaluate(() => {
    const inner = document.querySelector('.nav__inner').getBoundingClientRect()
    const name = document.querySelector('.nav__name')
    const link = document.querySelector('.nav__link')
    const cs = (el, k) => getComputedStyle(el)[k]
    return JSON.stringify({
      rect: [inner.left, inner.top, inner.width, inner.height].map((v) => Math.round(v * 10) / 10),
      nameShown: cs(name, 'display') !== 'none' && cs(name, 'visibility') !== 'hidden',
      nameFont: cs(name, 'fontSize') + cs(name, 'letterSpacing'),
      linkFont: cs(link, 'fontSize') + cs(link, 'letterSpacing'),
      bg: cs(document.querySelector('.nav__inner'), 'backgroundColor') !== 'rgba(0, 0, 0, 0)',
      radius: cs(document.querySelector('.nav__inner'), 'borderTopLeftRadius'),
      hasState: document.querySelector('.nav').hasAttribute('data-compact'),
    })
  })

// ── Navigation ───────────────────────────────────────────────────────────
{
  const { context, page } = await open()
  const navTop = await navShape(page)
  check('nav has no landing state: no scroll-driven state attribute, pill shape from the first frame', !JSON.parse(navTop).hasState && JSON.parse(navTop).bg && JSON.parse(navTop).radius !== '0px', navTop)
  await page.click('.nav__link[href="#research"]')
  await page.waitForTimeout(200)
  const midY = await page.evaluate(() => scrollY)
  check('nav click scrolls smoothly (not an instant jump)', midY > 0 && midY < (await top(page, 'research')) - 50, `scrollY after 200ms = ${Math.round(midY)}`)
  await page.waitForTimeout(2200)
  const y = await page.evaluate(() => scrollY)
  check('nav click lands on the section', Math.abs(y - (await top(page, 'research'))) < 3, `${Math.round(y)} vs ${Math.round(await top(page, 'research'))}`)
  check('nav is identical (size, position, type, branding) at the top and after scrolling', (await navShape(page)) === navTop)
  check('active link marked with aria-current', (await page.getAttribute('.nav__link[href="#research"]', 'aria-current')) === 'location')
  check('hash updated without reload', (await page.evaluate(() => location.hash)) === '#research')
  await page.click('.nav__name')
  await page.waitForTimeout(2500)
  check('name link returns to top', (await page.evaluate(() => scrollY)) < 3)
  check('nav is still identical back at the top', (await navShape(page)) === navTop)
  await context.close()
}

// ── Carousel ─────────────────────────────────────────────────────────────
{
  const { context, page } = await open()
  const sel = '#projects'
  await page.evaluate(async () => scrollTo({ top: document.getElementById('projects').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(500)
  check('carousel starts on first card', (await activeIndex(page, sel)) === 0)
  const dims = await page.$$eval(`${sel} .card`, (cs) => cs.map((c) => c.offsetWidth + 'x' + c.offsetHeight))
  check('all cards share identical dimensions', new Set(dims).size === 1, dims[0])

  await page.click(`${sel} .carousel__btn[aria-label="Next project"]`)
  await page.waitForTimeout(700)
  check('next button advances', (await activeIndex(page, sel)) === 1)
  const scales = await page.$$eval(`${sel} .card`, (cs) => cs.slice(0, 3).map((c) => new DOMMatrix(getComputedStyle(c).transform).a))
  check('centre card is largest, sides smaller', scales[1] > scales[0] && scales[1] > scales[2] && Math.abs(scales[1] - 1) < 0.01, scales.map((s) => s.toFixed(3)).join(', '))

  await page.focus(`${sel} .carousel__viewport`)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  check('ArrowRight advances', (await activeIndex(page, sel)) === 2)
  await page.keyboard.press('End')
  await page.waitForTimeout(900)
  check('End jumps to last', (await activeIndex(page, sel)) === 6)
  await page.keyboard.press('Home')
  await page.waitForTimeout(1000)
  check('Home jumps to first', (await activeIndex(page, sel)) === 0)

  // Mid-transition: the carousel must glide, not teleport.
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(90)
  const midPos = await page.$eval(`${sel} .carousel__slot:nth-child(1) .card`, (c) => new DOMMatrix(getComputedStyle(c).transform).e)
  await page.waitForTimeout(700)
  const endPos = await page.$eval(`${sel} .carousel__slot:nth-child(1) .card`, (c) => new DOMMatrix(getComputedStyle(c).transform).e)
  check('carousel slides (intermediate position observed)', midPos !== endPos && Math.abs(midPos) < Math.abs(endPos) && midPos !== 0, `mid=${midPos.toFixed(0)} end=${endPos.toFixed(0)}`)

  // Mouse drag.
  const box = await (await page.$(`${sel} .carousel__viewport`)).boundingBox()
  const cy = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, cy)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 - 120, cy, { steps: 6 })
  await page.mouse.move(box.x + box.width / 2 - 340, cy, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(900)
  check('mouse drag advances the carousel', (await activeIndex(page, sel)) >= 2, `index=${await activeIndex(page, sel)}`)

  // Horizontal trackpad wheel.
  const before = await activeIndex(page, sel)
  await page.mouse.move(box.x + box.width / 2, cy)
  await page.mouse.wheel(120, 0)
  await page.waitForTimeout(800)
  check('horizontal wheel advances', (await activeIndex(page, sel)) === before + 1)
  const sy = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 40)
  await page.waitForTimeout(200)
  check('vertical wheel still scrolls the page', (await page.evaluate(() => scrollY)) > sy)

  // Clicking a side card brings it forward; focusing its link does too.
  await page.click(`${sel} .carousel__btn[aria-label="Previous project"]`)
  await page.waitForTimeout(700)
  const idx = await activeIndex(page, sel)
  await page.focus(`${sel} .carousel__slot:nth-child(${idx + 2}) .card__link`)
  await page.waitForTimeout(700)
  check('focusing a side card’s link centres it', (await activeIndex(page, sel)) === idx + 1)
  await context.close()
}

// ── Touch swipe (CDP touch events → pointer events) ──────────────────────
{
  const { context, page } = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  await page.evaluate(() => scrollTo({ top: document.getElementById('projects').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(500)
  const box = await (await page.$('#projects .carousel__viewport')).boundingBox()
  const cdp = await context.newCDPSession(page)
  const y = box.y + box.height / 2
  const touch = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] })
  await touch('touchStart', 300)
  for (let x = 300; x >= 90; x -= 30) {
    await touch('touchMove', x)
    await page.waitForTimeout(16)
  }
  await touch('touchEnd', 90)
  await page.waitForTimeout(900)
  check('touch swipe advances the carousel', (await activeIndex(page, '#projects')) === 1)
  const vs = await page.evaluate(() => scrollY)
  // vertical swipe must still scroll the page
  await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 600, yDistance: -300, speed: 800 })
  await page.waitForTimeout(500)
  check('vertical touch scroll still works over the carousel', (await page.evaluate(() => scrollY)) > vs)
  check('mobile: no horizontal page overflow', (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
  // dropdown menu
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(300)
  await page.tap('.nav__menu')
  await page.waitForTimeout(400)
  check('mobile menu opens as a dropdown (not full-screen)', await page.$eval('.nav__list', (l) => { const r = l.getBoundingClientRect(); return getComputedStyle(l).visibility === 'visible' && r.height < innerHeight * 0.8 }))
  await page.tap('.nav__link[href="#education"]')
  await page.waitForTimeout(2500)
  check('mobile menu link navigates and closes', (await page.getAttribute('.nav', 'data-open')) === 'false' && Math.abs((await page.evaluate(() => scrollY)) - (await top(page, 'education'))) < 4)
  await context.close()
}

// ── Link semantics: the label names the destination ──────────────────────
{
  const { context, page } = await open()
  const links = await page.$$eval('.card__link', (as) => as.map((a) => ({ section: a.closest('section').id, text: a.textContent.trim(), aria: a.getAttribute('aria-label'), host: new URL(a.href).hostname })))
  const expect = { projects: ['GitHub ↗', 'github.com'], research: ['GitHub ↗', 'github.com'], achievements: ['Certificate ↗', 'example.com'], extracurricular: ['View ↗', 'example.com'] }
  const wrong = links.filter((l) => !expect[l.section] || l.text !== expect[l.section][0] || l.host !== expect[l.section][1] || !l.aria.toLowerCase().startsWith(l.text.replace(' ↗', '').toLowerCase()))
  check('card link label, accessible name and host agree in every section', links.length === 7 + 4 + 0 + 4 + 3 && wrong.length === 0, wrong.length ? JSON.stringify(wrong[0]) : `${links.length} links; GitHub only on projects/research`)
  // Experiences cards carry no link and so reserve no room for one.
  check('experiences cards have no link and no clipped summary', await page.$$eval('#experiences .card', (cs) => cs.length > 0 && cs.every((c) => !c.querySelector('.card__link') && c.querySelector('.card__desc').scrollHeight <= c.querySelector('.card__desc').clientHeight + 1)))
  const bare = await page.$$eval('#extracurricular .card', (cs) => cs.map((c) => c.querySelectorAll('a').length))
  check('an entry with no destination simply omits the link (no dead or fake link)', bare.filter((n) => n === 0).length === 1 && bare.length === 4, JSON.stringify(bare))
  await context.close()
}

// ── Education: a credential, not a project card ──────────────────────────
{
  const { context, page } = await open()
  const cards = await page.$$eval('#education .card', (cs) =>
    cs.map((c) => ({
      top: c.querySelector('.card__tags')?.textContent,
      title: c.querySelector('.card__title')?.textContent,
      meta: [...c.querySelectorAll('.card__meta li')].map((li) => li.textContent),
      hasDesc: !!c.querySelector('.card__desc'),
      links: c.querySelectorAll('a').length,
      order: [...c.children].map((el) => el.className.split(' ')[0]),
      metaFont: c.querySelector('.card__meta') ? getComputedStyle(c.querySelector('.card__meta')).fontSize : null,
      titleFont: getComputedStyle(c.querySelector('.card__title')).fontSize,
      badge: !!c.querySelector('progress, meter, [role="progressbar"], .badge'),
    })),
  )
  check('education cards have no summary paragraph', cards.every((c) => !c.hasDesc))
  check('hierarchy: degree · years → university → metadata (no link)', cards[0].order.join(',') === 'card__tags,card__title,card__meta' && /·/.test(cards[0].top), JSON.stringify(cards[0].order))
  check('undergrad shows "GPA: 3.7 / 4.0" and "Honors: Data Science"', cards[0].meta.join('|') === 'GPA: 3.7 / 4.0|Honors: Data Science', JSON.stringify(cards[0].meta))
  check('absent optional fields are omitted (no distinction line on the second entry; education has no link)', cards[1].meta.length === 1 && cards.every((c) => c.links === 0), JSON.stringify({ meta: cards[1].meta, links: cards[1].links }))
  const fit = await page.$$eval('#education .card', (cs) =>
    cs.map((c) => {
      const kids = [...c.children]
      const last = kids[kids.length - 1].getBoundingClientRect().bottom
      const pad = parseFloat(getComputedStyle(c).paddingBottom)
      const b = parseFloat(getComputedStyle(c).borderBottomWidth)
      const natural = (() => { const h = c.style.height; c.style.height = 'auto'; const n = c.offsetHeight; c.style.height = h; return n })()
      return { spare: +(c.getBoundingClientRect().bottom - last - pad - b).toFixed(1), h: c.offsetHeight, natural, border: getComputedStyle(c).borderTopWidth, padding: getComputedStyle(c).padding }
    }),
  )
  const stdH = await page.$eval('#projects .card', (c) => c.offsetHeight)
  const stdBorder = await page.$eval('#projects .card', (c) => getComputedStyle(c).borderTopWidth + '|' + getComputedStyle(c).padding)
  const tallest = Math.max(...fit.map((f) => f.natural))
  check('education cards are all the height of the tallest (no taller than its content needs)', fit.every((f) => f.h === tallest) && fit.some((f) => f.natural !== tallest) && fit.some((f) => Math.abs(f.spare) <= 1) && tallest < stdH * 0.7, JSON.stringify(fit.map((f) => ({ h: f.h, natural: f.natural, spare: f.spare }))) + ` (standard card ${stdH}px)`)
  check('education cards keep the same border width and padding as every other card', fit.every((f) => f.border + '|' + f.padding === stdBorder), stdBorder)
  check('GPA is quiet: body-size text, no badge/meter/progress bar', cards.every((c) => !c.badge) && parseFloat(cards[0].metaFont) < parseFloat(cards[0].titleFont) / 1.5, `${cards[0].metaFont} vs title ${cards[0].titleFont}`)
  await context.close()
}

// ── Education: two cards keep the standard size ──────────────────────────
{
  const { context, page } = await open()
  const eduW = await page.$eval('#education .card', (c) => c.offsetWidth)
  const projW = await page.$eval('#projects .card', (c) => c.offsetWidth)
  check('education cards keep standard width', eduW === projW, `${eduW}px vs ${projW}px`)
  check('education has no carousel controls', (await page.$('#education .carousel__controls')) === null)
  await page.evaluate(() => scrollTo({ top: document.getElementById('education').offsetTop, behavior: 'instant' }))
  await page.waitForTimeout(400)
  const xs = await page.$$eval('#education .card', (cs) => cs.map((c) => { const r = c.getBoundingClientRect(); return [r.left, r.right] }))
  const centre = (xs[0][0] + xs[1][1]) / 2
  check('education pair is centred', Math.abs(centre - 720) < 4, `centre=${centre.toFixed(1)}`)
  await context.close()
}

// ── Determinism: scrolling backward reproduces the same pixels ───────────
{
  const { context, page } = await open({ reducedMotion: 'reduce' })
  const hashAt = async (y) => {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y)
    await page.waitForTimeout(350)
    return createHash('md5').update(await page.screenshot()).digest('hex')
  }
  const forward = await hashAt(3300)
  await hashAt(6000)
  await hashAt(900)
  const backward = await hashAt(3300)
  check('scroll forward → backward gives pixel-identical frame (mid-journey)', forward === backward)
  // Full range: 0 → 100% → 0, and 100% reached from below vs. from above.
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
  const top0 = await hashAt(0)
  const bottomUp = await hashAt(max)
  const back0 = await hashAt(0)
  await hashAt(max * 0.5)
  const bottomDown = await hashAt(max)
  check('0% → 100% → 0%: the opening frame returns pixel-identical', top0 === back0)
  check('100% is the same frame whether reached from the top or from mid-page', bottomUp === bottomDown)
  await context.close()
}

await browser.close()
console.log(errors.length ? '\nCONSOLE:\n' + [...new Set(errors)].join('\n') : '\nno console errors/warnings')
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
