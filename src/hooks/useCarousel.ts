import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { CAROUSEL } from '../config/carousel'
import { clamp, lerp, smoothstep } from '../utils/interpolation'
import { prefersReducedMotion } from './motion'

/**
 * Compact cards (`.card--compact`, used by Education) size to their content; so that a set of them reads as a set, they
 * all take the height of the tallest. Natural heights are re-read each time, so removing a field shrinks them again.
 * Standard cards (`.card--fit`) are the standard tile size at minimum, so their box keeps the standard padding.
 */
function equaliseCompactCards(cards: (HTMLElement | null)[]): { tallest: number; pads: number } | null {
  const compact = cards.filter((el): el is HTMLElement => !!el && el.classList.contains('card--compact'))
  if (!compact.length) return null
  for (const el of compact) el.style.height = ''
  const tallest = Math.max(...compact.map((el) => el.offsetHeight))
  for (const el of compact) el.style.height = `${tallest}px`
  return { tallest, pads: compact[0].classList.contains('card--fit') ? 2 : 1 }
}

/**
 * Carousel engine. The focus position `pos` is a float in card units; a
 * critically-damped spring chases an integer `target`. Every card is placed
 * as a pure function of its signed distance `d = i - pos` from the centre
 * (scale, offset, dimming all interpolate continuously), and those styles are
 * written straight to the DOM — dragging and animating never re-render React.
 */
export function useCarousel(count: number) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const [index, setIndex] = useState(0)
  /** True when the items fit side by side at full size — no carousel needed (e.g. two education cards). */
  const [isStatic, setIsStatic] = useState(false)

  const sim = useRef({
    pos: 0,
    vel: 0,
    target: 0,
    raf: 0,
    last: 0,
    dragging: false,
    cardW: 320,
    gap: 24,
    isStatic: false,
    suppressClick: false,
    wheelAcc: 0,
    wheelIdle: 0,
    /** Direction (±1) of the card step this swipe has already made; 0 when free to step. */
    wheelSpent: 0,
    tick: null as unknown as FrameRequestCallback,
  })
  const drag = useRef<{
    id: number
    x: number
    y: number
    pos: number
    moved: boolean
    samples: { t: number; x: number }[]
  } | null>(null)

  const setCardRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      cardRefs.current[i] = el
    },
    [],
  )

  const render = useCallback(() => {
    const s = sim.current
    const { sideScale, sideDrop, visibleRadius } = CAROUSEL
    const step1 = (s.cardW * (1 + sideScale)) / 2 + s.gap
    const step2 = s.cardW * sideScale + s.gap
    const staticStep = s.cardW + s.gap * 1.5
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      let x: number
      let y = 0
      let scale = 1
      let focus = 1
      let opacity = 1
      let ad = 0
      if (s.isStatic) {
        x = (i - (count - 1) / 2) * staticStep
      } else {
        const d = i - s.pos
        ad = Math.abs(d)
        const t = Math.min(ad, 1)
        const e = smoothstep(0, 1, t)
        x = Math.sign(d) * (t * step1 + Math.max(0, Math.min(ad, 3) - 1) * step2)
        scale = lerp(1, sideScale, e) - Math.max(0, Math.min(ad, 2) - 1) * 0.06
        y = lerp(0, sideDrop, e)
        focus = 1 - e
        opacity = ad <= 1 ? 1 : 1 - smoothstep(1, visibleRadius, ad)
      }
      const hidden = opacity < 0.01
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
      el.style.opacity = opacity.toFixed(3)
      el.style.visibility = hidden ? 'hidden' : 'visible'
      el.style.zIndex = String(10 - Math.round(ad * 3))
      el.style.setProperty('--focus', focus.toFixed(3))
      const active = !s.isStatic && ad < 0.5
      if (el.dataset.active !== String(active)) el.dataset.active = String(active)
    })
  }, [count])

  // The spring loop lives in an effect so it can reschedule itself without a stale closure.
  useLayoutEffect(() => {
    const s = sim.current
    s.tick = function tick(now: number) {
      s.raf = 0
      const dt = Math.min((now - s.last) / 1000, 1 / 30)
      s.last = now
      let settled = true
      if (!s.dragging) {
        const w = CAROUSEL.omega
        const x = s.pos - s.target
        s.vel += (-w * w * x - 2 * w * s.vel) * dt
        s.pos += s.vel * dt
        if (Math.abs(s.pos - s.target) < 0.0008 && Math.abs(s.vel) < 0.002) {
          s.pos = s.target
          s.vel = 0
        } else settled = false
      } else settled = false
      render()
      if (!settled) s.raf = requestAnimationFrame(s.tick)
    }
  }, [render])

  const kick = useCallback(() => {
    const s = sim.current
    if (prefersReducedMotion()) {
      s.pos = s.target
      s.vel = 0
      render()
      return
    }
    if (!s.raf) {
      s.last = performance.now()
      s.raf = requestAnimationFrame(s.tick)
    }
  }, [render])

  const goTo = useCallback(
    (i: number) => {
      const s = sim.current
      if (s.isStatic) return
      const next = clamp(Math.round(i), 0, count - 1)
      s.target = next
      setIndex(next)
      kick()
    },
    [count, kick],
  )

  // Measure card + gap from the live CSS tokens and re-layout on resize.
  useLayoutEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const measure = () => {
      const s = sim.current
      const first = cardRefs.current[0]
      if (!first) return
      const cs = getComputedStyle(vp)
      s.cardW = first.offsetWidth
      s.gap = parseFloat(cs.columnGap) || 24
      // Fixed-size cards sit in a box sized from --card-h (CSS). Compact cards size to their content, so the box must too —
      // otherwise the space they don't use becomes dead space before the next section.
      const compact = equaliseCompactCards(cardRefs.current)
      vp.style.height = compact ? `calc(${compact.tallest}px + ${compact.pads} * var(--carousel-pad))` : ''
      const fits = count <= 2 && count * s.cardW + (count - 1) * s.gap * 1.5 <= vp.clientWidth - 32
      s.isStatic = fits
      setIsStatic(fits)
      render()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(vp)
    // Text metrics change when web fonts arrive, which can change a compact card's natural height.
    void document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [count, render])

  // Horizontal trackpad swipes (non-passive so they don't trigger browser back/forward).
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      const s = sim.current
      if (s.isStatic || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      const now = performance.now()
      // A trackpad swipe keeps sending events for a second or so as it coasts. One swipe moves one card; the swipe is
      // over when the events stop, or when they turn around (a deliberate swipe back).
      if (now - s.wheelIdle > 160) {
        s.wheelAcc = 0
        s.wheelSpent = 0
      }
      s.wheelIdle = now
      if (s.wheelSpent && Math.sign(e.deltaX) === -s.wheelSpent && Math.abs(e.deltaX) >= 6) {
        s.wheelAcc = 0
        s.wheelSpent = 0
      }
      if (s.wheelSpent) return
      s.wheelAcc += e.deltaX
      if (Math.abs(s.wheelAcc) >= CAROUSEL.wheelThreshold) {
        s.wheelSpent = Math.sign(s.wheelAcc)
        goTo(s.target + s.wheelSpent)
        s.wheelAcc = 0
      }
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [goTo])

  useEffect(() => {
    const s = sim.current
    return () => cancelAnimationFrame(s.raf)
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    const s = sim.current
    if (s.isStatic) return
    const map: Record<string, number> = {
      ArrowRight: s.target + 1,
      ArrowLeft: s.target - 1,
      Home: 0,
      End: count - 1,
    }
    if (e.key in map && e.target === e.currentTarget) {
      e.preventDefault()
      goTo(map[e.key])
    }
  }

  const stepPx = () => {
    const s = sim.current
    return (s.cardW * (1 + CAROUSEL.sideScale)) / 2 + s.gap
  }

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const s = sim.current
    if (s.isStatic || (e.pointerType === 'mouse' && e.button !== 0)) return
    s.suppressClick = false
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      pos: s.pos,
      moved: false,
      samples: [{ t: performance.now(), x: e.clientX }],
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    const s = sim.current
    if (!d || e.pointerId !== d.id) return
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(dx) < CAROUSEL.dragThreshold) return
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) {
        drag.current = null
        return
      }
      d.moved = true
      s.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.classList.add('is-dragging')
    }
    let pos = d.pos - dx / stepPx()
    const max = count - 1
    if (pos < 0) pos *= CAROUSEL.edgeResistance
    else if (pos > max) pos = max + (pos - max) * CAROUSEL.edgeResistance
    s.pos = pos
    const now = performance.now()
    d.samples.push({ t: now, x: e.clientX })
    while (d.samples.length > 2 && now - d.samples[0].t > 120) d.samples.shift()
    if (!s.raf) render()
  }

  const endDrag = (e: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = drag.current
    const s = sim.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    e.currentTarget.classList.remove('is-dragging')
    if (!d.moved) return
    s.dragging = false
    s.suppressClick = true
    window.setTimeout(() => (s.suppressClick = false), 0)
    const first = d.samples[0]
    const last = d.samples[d.samples.length - 1]
    const dtSec = Math.max((last.t - first.t) / 1000, 0.016)
    const v = cancelled ? 0 : -((last.x - first.x) / dtSec) / stepPx()
    s.vel = clamp(v, -9, 9)
    const projected = s.pos + s.vel * CAROUSEL.flingSeconds
    const from = Math.round(d.pos)
    const next = clamp(Math.round(projected), from - CAROUSEL.maxFling, from + CAROUSEL.maxFling)
    s.target = clamp(next, 0, count - 1)
    setIndex(s.target)
    kick()
  }

  const onClickCapture = (e: React.MouseEvent) => {
    if (sim.current.suppressClick) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return {
    viewportRef,
    setCardRef,
    index,
    isStatic,
    goTo,
    next: () => goTo(sim.current.target + 1),
    prev: () => goTo(sim.current.target - 1),
    viewportProps: {
      onKeyDown,
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: PointerEvent<HTMLElement>) => endDrag(e, false),
      onPointerCancel: (e: PointerEvent<HTMLElement>) => endDrag(e, true),
      onClickCapture,
    },
  }
}
