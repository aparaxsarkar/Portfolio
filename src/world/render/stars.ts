import { SHOOTING_STARS, STARS } from '../../config/world'
import { clamp, lerp, smoothstep } from '../../utils/interpolation'
import { createRng } from '../../utils/random'
import type { WorldState } from '../state'
import type { View } from './view'

/**
 * Stars are placed once from a seed — the sky never reshuffles. They emerge in
 * order of brightness as `stars.opacity` rises through twilight (the brightest
 * first, like a real dusk), so there is no moment where "the stars turn on".
 */

interface Star {
  x: number
  y: number
  r: number
  alpha: number
  /** Opacity level at which this star starts to appear. */
  threshold: number
  phase: number
  speed: number
  tint: string
  glow: boolean
}

export interface Starfield {
  stars: Star[]
  band: HTMLCanvasElement | null
  glowSprite: HTMLCanvasElement
  w: number
  h: number
}

const TINTS = ['#ffffff', '#ffffff', '#dbe7ff', '#fff0d8', '#c9dcff']

function createGlowSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,0.55)')
  r.addColorStop(0.25, 'rgba(210,225,255,0.16)')
  r.addColorStop(1, 'rgba(210,225,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return c
}

/** A faint diagonal haze of unresolved stars — depth, rather than more dots. */
function createBand(w: number, hz: number): HTMLCanvasElement | null {
  if (STARS.band <= 0) return null
  const scale = 0.5
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(w * scale))
  c.height = Math.max(2, Math.round(hz * scale))
  const g = c.getContext('2d')!
  g.scale(scale, scale)
  const rng = createRng(STARS.seed + 5)
  const a = { x: -0.1 * w, y: hz * 0.92 }
  const b = { x: 1.1 * w, y: hz * 0.06 }
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = -(b.y - a.y) / len
  const ny = (b.x - a.x) / len
  const spread = Math.min(hz, w) * 0.11
  const gauss = () => (rng() + rng() + rng() + rng() - 2) / 2
  // Broad soft clouds of light.
  for (let i = 0; i < 14; i++) {
    const t = rng()
    const off = gauss() * spread * 0.9
    const x = lerp(a.x, b.x, t) + nx * off + Math.sin(t * 7) * spread * 0.3
    const y = lerp(a.y, b.y, t) + ny * off
    const r = rng.range(spread * 0.9, spread * 2)
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    const warm = rng() > 0.6
    grad.addColorStop(0, warm ? 'rgba(255,226,196,0.075)' : 'rgba(165,185,255,0.085)')
    grad.addColorStop(1, 'rgba(165,185,255,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Fine grain of tiny stars inside the band.
  const dots = Math.round(Math.min(1800, (w * hz) / 700))
  for (let i = 0; i < dots; i++) {
    const t = rng()
    const off = gauss() * spread * 0.7
    const x = lerp(a.x, b.x, t) + nx * off + Math.sin(t * 7) * spread * 0.3
    const y = lerp(a.y, b.y, t) + ny * off
    g.fillStyle = `rgba(235,240,255,${(0.06 + rng() * 0.2).toFixed(3)})`
    g.fillRect(x, y, 0.9, 0.9)
  }
  return c
}

export function createStarfield(view: View): Starfield {
  const { w, horizonPx } = view
  const rng = createRng(STARS.seed)
  const count = Math.min(STARS.max, Math.round(((w * horizonPx) / 10000) * STARS.density))
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const b = rng() // brightness rank
    stars.push({
      x: rng() * w,
      y: rng() * horizonPx,
      r: 0.45 + 1.25 * b ** 4,
      alpha: 0.28 + 0.72 * b ** 1.4,
      threshold: 0.04 + 0.8 * (1 - b),
      phase: rng() * Math.PI * 2,
      speed: rng.range(0.5, 2.2),
      tint: rng.pick(TINTS),
      glow: b > 0.965,
    })
  }
  return { stars, band: createBand(w, horizonPx), glowSprite: createGlowSprite(), w, h: horizonPx }
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  field: Starfield,
  state: WorldState,
  view: View,
  seconds: number,
  animate: boolean,
) {
  const { w, h, dpr, horizonPx } = view
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const S = state.stars.opacity
  if (S < 0.004) return

  if (field.band) {
    ctx.globalAlpha = STARS.band * smoothstep(0.3, 0.95, S) * 0.9
    ctx.drawImage(field.band, 0, 0, w, horizonPx)
  }

  for (const s of field.stars) {
    const appear = smoothstep(s.threshold, s.threshold + 0.18, S)
    if (appear <= 0.002) continue
    const twinkle = animate ? 1 - 0.28 * (0.5 + 0.5 * Math.sin(seconds * s.speed + s.phase)) : 1
    const nearHorizon = smoothstep(horizonPx, horizonPx * 0.6, s.y)
    const a = s.alpha * appear * twinkle * nearHorizon
    if (a <= 0.004) continue
    ctx.globalAlpha = a
    if (s.glow) {
      const size = s.r * 11
      ctx.drawImage(field.glowSprite, s.x - size / 2, s.y - size / 2, size, size)
    }
    ctx.fillStyle = s.tint
    if (s.r < 1) {
      ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2)
    } else {
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

// ── Shooting stars ────────────────────────────────────────────────────────

interface Shot {
  x: number
  y: number
  dx: number
  dy: number
  speed: number
  life: number
  age: number
  length: number
  peak: number
}

/**
 * Rare, brief and unscheduled: gaps are drawn from an exponential-ish
 * distribution whose mean shrinks with `shootingStars.activity`, so deep night
 * is busier than twilight but never rhythmic.
 */
export class ShootingStars {
  private shots: Shot[] = []
  private nextAt = Infinity
  private rng = Math.random

  get active() {
    return this.shots.length > 0
  }

  reset() {
    this.shots = []
    this.nextAt = Infinity
  }

  update(now: number, dt: number, activity: number, view: View) {
    if (activity < 0.03) {
      this.nextAt = Infinity
      for (const s of this.shots) s.age += dt
      this.shots = this.shots.filter((s) => s.age < s.life)
      return
    }
    if (this.nextAt === Infinity) this.nextAt = now + 2 + this.rng() * 5
    if (now >= this.nextAt) {
      this.spawn(view)
      if (this.rng() < 0.12) this.nextAt = now + 0.35 + this.rng() * 0.9 // the occasional pair
      else {
        const mean = lerp(SHOOTING_STARS.meanGapQuiet, SHOOTING_STARS.meanGapBusy, activity)
        const gap = -Math.log(1 - this.rng() * 0.97) * mean
        this.nextAt = now + clamp(gap, SHOOTING_STARS.minGap, mean * 3)
      }
    }
    for (const s of this.shots) s.age += dt
    this.shots = this.shots.filter((s) => s.age < s.life)
  }

  private spawn(view: View) {
    const { w, horizonPx } = view
    const rng = this.rng
    const angle = ((18 + rng() * 40) * Math.PI) / 180
    const dir = rng() > 0.5 ? 1 : -1
    const life = lerp(SHOOTING_STARS.lifeMin, SHOOTING_STARS.lifeMax, rng())
    const travel = (0.2 + rng() * 0.2) * Math.max(w, 720)
    this.shots.push({
      x: w * (0.12 + rng() * 0.76),
      y: horizonPx * (0.04 + rng() * 0.4),
      dx: Math.cos(angle) * dir,
      dy: Math.sin(angle),
      speed: travel / life,
      life,
      age: 0,
      length: 90 + rng() * 150,
      peak: SHOOTING_STARS.peakAlpha * (0.6 + rng() * 0.4),
    })
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const s of this.shots) {
      const t = s.age / s.life
      const env = Math.sin(Math.PI * clamp(t)) ** 0.8
      const hx = s.x + s.dx * s.speed * s.age
      const hy = s.y + s.dy * s.speed * s.age
      const len = s.length * Math.min(1, s.age / 0.12 + 0.15)
      const tx = hx - s.dx * len
      const ty = hy - s.dy * len
      const g = ctx.createLinearGradient(tx, ty, hx, hy)
      g.addColorStop(0, 'rgba(210,225,255,0)')
      g.addColorStop(1, `rgba(245,248,255,${(s.peak * env).toFixed(3)})`)
      ctx.strokeStyle = g
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.globalAlpha = s.peak * env
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(hx, hy, 1.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}
