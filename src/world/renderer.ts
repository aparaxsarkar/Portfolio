import { DESIGN_HEIGHT, DPR_CAP, HORIZON } from '../config/world'
import { createGrainTile } from './render/grain'
import { drawLand } from './render/land'
import { buildScene, type Scene } from './render/scene'
import { drawSky } from './render/sky'
import { createStarfield, drawStars, ShootingStars, type Starfield } from './render/stars'
import type { View } from './render/view'
import { worldStore } from './store'

/**
 * Imperative canvas renderer, mounted once. Three stacked canvases —
 * sky (opaque) · stars (transparent, animated) · land (transparent) — so stars
 * sit behind the mountains. Sky and land repaint only when progress changes;
 * the star layer runs its own throttled loop, and only while stars are visible.
 */
export function createWorldRenderer(root: HTMLElement) {
  const [skyCanvas, starCanvas, landCanvas] = Array.from(root.querySelectorAll('canvas'))
  const skyCtx = skyCanvas.getContext('2d', { alpha: false })!
  const starCtx = starCanvas.getContext('2d')!
  const landCtx = landCanvas.getContext('2d')!
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const view: View = { w: 0, h: 0, dpr: 1, k: 1, widthD: 0, horizonPx: 0 }
  let scene: Scene | null = null
  let field: Starfield | null = null
  let grainSky: CanvasPattern | null = null
  let grainLand: CanvasPattern | null = null
  const shooting = new ShootingStars()

  let paintFrame = 0
  let loopFrame = 0
  let lastLoop = 0
  let destroyed = false

  const paint = () => {
    paintFrame = 0
    if (!scene || !field || destroyed) return
    const state = worldStore.get()
    drawSky(skyCtx, state, view, grainSky)
    drawLand(landCtx, scene, state, view, grainLand)
    paintStars(performance.now(), 0)
  }

  const paintStars = (now: number, dt: number) => {
    if (!field) return
    const state = worldStore.get()
    const animate = !reducedMotion.matches && !document.hidden
    drawStars(starCtx, field, state, view, now / 1000, animate)
    if (animate) {
      shooting.update(now / 1000, dt, state.shootingStars.activity, view)
      shooting.draw(starCtx)
    }
  }

  const wantsLoop = () =>
    !destroyed && !reducedMotion.matches && !document.hidden && worldStore.get().stars.opacity > 0.02

  const loop = (t: number) => {
    loopFrame = 0
    if (!wantsLoop()) return
    if (t - lastLoop >= 32) {
      paintStars(t, Math.min((t - lastLoop) / 1000, 0.1))
      lastLoop = t
    }
    loopFrame = requestAnimationFrame(loop)
  }

  const ensureLoop = () => {
    if (!loopFrame && wantsLoop()) {
      lastLoop = performance.now()
      loopFrame = requestAnimationFrame(loop)
    }
  }

  const schedule = () => {
    if (!paintFrame) paintFrame = requestAnimationFrame(paint)
    ensureLoop()
  }

  const resize = () => {
    const rect = root.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    if (!w || !h || (w === view.w && h === view.h && dpr === view.dpr)) return
    Object.assign(view, {
      w,
      h,
      dpr,
      k: h / DESIGN_HEIGHT,
      widthD: (w * DESIGN_HEIGHT) / h,
      horizonPx: h * HORIZON,
    })
    for (const c of [skyCanvas, starCanvas, landCanvas]) {
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
    }
    const tile = createGrainTile()
    grainSky = skyCtx.createPattern(tile, 'repeat')
    grainLand = landCtx.createPattern(tile, 'repeat')
    scene = buildScene(view.widthD)
    field = createStarfield(view)
    shooting.reset()
    schedule()
  }

  const unsubscribe = worldStore.subscribe(schedule)
  const observer = new ResizeObserver(resize)
  observer.observe(root)
  const onVisibility = () => {
    if (document.hidden) shooting.reset()
    schedule()
  }
  document.addEventListener('visibilitychange', onVisibility)
  reducedMotion.addEventListener('change', onVisibility)
  resize()

  return () => {
    destroyed = true
    unsubscribe()
    observer.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    reducedMotion.removeEventListener('change', onVisibility)
    cancelAnimationFrame(paintFrame)
    cancelAnimationFrame(loopFrame)
  }
}
