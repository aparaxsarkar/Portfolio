import { SECTION_PROGRESS } from '../config/world'
import { SECTIONS } from '../data/sections'
import { clamp, createSpline } from '../utils/interpolation'
import { worldStore } from '../world/store'

/**
 * Scroll driver — the only place scroll position becomes world progress.
 *
 *   native scroll → scrollY → monotone spline through section anchors → progress → worldStore
 *
 * Scrolling stays native (no hijacking). Progress is a pure function of
 * scrollY, so scrolling backwards retraces the exact same states.
 */

const COMPACT_ENTER = 60
const COMPACT_LEAVE = 20

const page = { active: 0, compact: false }
const pageListeners = new Set<() => void>()
let anchors: number[] = SECTIONS.map(() => 0)

/** Discrete page state (active section, compact nav). Safe for useSyncExternalStore. */
export const pageStore = {
  subscribe(listener: () => void) {
    pageListeners.add(listener)
    return () => {
      pageListeners.delete(listener)
    }
  },
  getActive: () => page.active,
  getCompact: () => page.compact,
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function scrollToSection(id: string) {
  const index = SECTIONS.findIndex((s) => s.id === id)
  if (index < 0) return
  window.scrollTo({ top: anchors[index] ?? 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`)
  document.getElementById(id)?.focus({ preventScroll: true })
}

export function startScrollDriver() {
  let toProgress: (y: number) => number = () => 0
  let frame = 0
  let measureFrame = 0

  const measure = () => {
    measureFrame = 0
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const ys: number[] = []
    const ps: number[] = []
    SECTIONS.forEach((s, i) => {
      const el = document.getElementById(s.id)
      const raw = i === 0 ? 0 : el ? el.getBoundingClientRect().top + window.scrollY : (ys[i - 1] ?? 0) + 1
      const prev = ys.length ? ys[ys.length - 1] : -1
      ys.push(Math.min(Math.max(raw, prev + 1), maxScroll + i)) // strictly increasing
      ps.push(SECTION_PROGRESS[s.id] ?? 0)
    })
    // The journey always ends at the true bottom of the page.
    ys[ys.length - 1] = Math.max(maxScroll, ys[ys.length - 2] + 1)
    ps[ps.length - 1] = 1
    anchors = ys.map((y) => Math.min(y, maxScroll))
    toProgress = createSpline(ys, ps)
    update()
  }

  const update = () => {
    frame = 0
    const y = window.scrollY
    worldStore.setProgress(clamp(toProgress(y)))
    // The scroll cue fades as soon as the visitor starts moving.
    document.documentElement.style.setProperty('--cue-opacity', String(clamp(1 - y / (window.innerHeight * 0.18))))

    const probe = y + window.innerHeight * 0.5
    let active = 0
    for (let i = 0; i < anchors.length; i++) if (anchors[i] <= probe) active = i
    const compact = page.compact ? y > COMPACT_LEAVE : y > COMPACT_ENTER
    if (active !== page.active || compact !== page.compact) {
      page.active = active
      page.compact = compact
      pageListeners.forEach((l) => l())
    }
  }

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  const queueMeasure = () => {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure)
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', queueMeasure)
  window.addEventListener('load', queueMeasure)
  const resizeObserver = new ResizeObserver(queueMeasure)
  resizeObserver.observe(document.body)
  void document.fonts?.ready.then(queueMeasure)

  measure()
  const hash = location.hash.slice(1)
  if (hash && SECTIONS.some((s) => s.id === hash)) {
    window.scrollTo({ top: anchors[SECTIONS.findIndex((s) => s.id === hash)], behavior: 'auto' })
    update()
  }

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', queueMeasure)
    window.removeEventListener('load', queueMeasure)
    resizeObserver.disconnect()
    cancelAnimationFrame(frame)
    cancelAnimationFrame(measureFrame)
  }
}
