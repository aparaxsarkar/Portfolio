import { clamp, smoothstep } from '../../utils/interpolation'
import { mixFast, mixRgb, rgba } from '../../utils/color'
import type { WorldState } from '../state'
import { CLOUDS } from './scene'
import type { View } from './view'

/** Vertical squash of the horizon bloom (smaller = a glow that hugs the horizon, as a real dawn does). */
const BLOOM_FLATNESS = 0.19

/** Reach of the sun's scattering halo, as a fraction of viewport height. Kept moderate so it never washes out nearby text. */
const HALO_RADIUS = 0.4

/** Sky: gradient (mixed in OKLab), horizon bloom, sun, thin high clouds. */
export function drawSky(ctx: CanvasRenderingContext2D, state: WorldState, view: View, grain: CanvasPattern | null) {
  const { w, h, dpr, horizonPx } = view
  const { sky, sun } = state
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  // Gradient: many OKLab-mixed stops so the browser's sRGB interpolation can't muddy it.
  const g = ctx.createLinearGradient(0, 0, 0, horizonPx)
  const N = 12
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const c = t < 0.5 ? mixRgb(sky.top, sky.mid, t / 0.5) : mixRgb(sky.mid, sky.horizon, ((t - 0.5) / 0.5) ** 2.6)
    g.addColorStop(t, rgba(c))
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, horizonPx)
  ctx.fillStyle = rgba(sky.horizon)
  ctx.fillRect(0, horizonPx - 1, w, h - horizonPx + 1)

  const sx = sun.x * w
  const sy = sun.y * h
  // 1 when the sun sits on the horizon, 0 when it is high.
  const near = 1 - clamp(Math.abs(sun.elevation) / 0.55)

  // Horizon bloom — a wide, flat glow centred under the sun that survives sunset.
  {
    const R = w * 0.72
    ctx.save()
    ctx.translate(sx, horizonPx)
    ctx.scale(1, BLOOM_FLATNESS)
    const b = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
    const a = sun.glowStrength * (0.3 + 0.55 * near)
    b.addColorStop(0, rgba(sun.glow, a))
    b.addColorStop(0.35, rgba(sun.glow, a * 0.45))
    b.addColorStop(1, rgba(sun.glow, 0))
    ctx.fillStyle = b
    ctx.fillRect(-R, -R, R * 2, R * 2)
    ctx.restore()
  }

  // Thin high clouds, lit from the sun's side.
  {
    const k = view.k
    for (const c of CLOUDS) {
      const cx = c.u * w
      const cy = c.y * k
      const dist = Math.hypot((cx - sx) / w, (cy - sy) / h)
      const lit = 1 - smoothstep(0.1, 0.7, dist)
      const alpha = (0.035 + 0.06 * lit) * (0.25 + 0.75 * clamp(sun.glowStrength + 0.2))
      const color = mixFast(state.terrain.cloud, sun.glow, lit * 0.55)
      const L = c.len * k
      const T = c.thick * k
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * L * 0.34
        const oy = (i === 1 ? -0.4 : 0.5) * T
        ctx.save()
        ctx.translate(cx + ox, cy + oy)
        ctx.scale(1, (T * (i === 1 ? 1.15 : 0.85)) / (L * 0.62))
        const r = ctx.createRadialGradient(0, 0, 0, 0, 0, L * 0.62)
        r.addColorStop(0, rgba(color, alpha))
        r.addColorStop(0.55, rgba(color, alpha * 0.4))
        r.addColorStop(1, rgba(color, 0))
        ctx.fillStyle = r
        ctx.fillRect(-L, -L, L * 2, L * 2)
        ctx.restore()
      }
    }
  }

  // Paper tooth + dither for the sky itself. Painted BEFORE the sun on purpose: the sun is a light source, so it must sit on
  // top of the texture rather than be speckled by it (an overlay painted last put dark specks on the bright disc, and on
  // phones — where this canvas is stretched 1.3–2× — they read as coarse grain).
  if (grain) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.4
    ctx.fillStyle = grain
    ctx.fillRect(0, 0, w * dpr, h * dpr)
    ctx.globalAlpha = 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // back to CSS-pixel coordinates for the sun
  }

  // Sun: wide scattering halo → tight bloom → soft-edged disc, larger near the horizon.
  if (sun.intensity > 0.002 || sun.glowStrength > 0.002) {
    const I = sun.intensity
    const haloR = h * HALO_RADIUS
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR)
    halo.addColorStop(0, rgba(sun.glow, 0.34 * I))
    halo.addColorStop(0.16, rgba(sun.glow, 0.16 * I))
    halo.addColorStop(0.45, rgba(sun.glow, 0.035 * I))
    halo.addColorStop(1, rgba(sun.glow, 0))
    ctx.fillStyle = halo
    ctx.fillRect(sx - haloR, sy - haloR, haloR * 2, haloR * 2)

    const r = h * 0.027 * (1 + 0.5 * near)
    const bloomR = r * 3.4
    const bloom = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, bloomR)
    bloom.addColorStop(0, rgba(sun.color, 0.55 * I))
    bloom.addColorStop(1, rgba(sun.color, 0))
    ctx.fillStyle = bloom
    ctx.fillRect(sx - bloomR, sy - bloomR, bloomR * 2, bloomR * 2)

    const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 1.22)
    disc.addColorStop(0, rgba(sun.color, I))
    disc.addColorStop(0.8, rgba(sun.color, I))
    disc.addColorStop(1, rgba(sun.color, 0))
    ctx.fillStyle = disc
    ctx.beginPath()
    ctx.arc(sx, sy, r * 1.22, 0, Math.PI * 2)
    ctx.fill()
  }
}
