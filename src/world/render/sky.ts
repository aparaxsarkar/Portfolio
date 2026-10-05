import { clamp, smoothstep } from '../../utils/interpolation'
import { mixFast, mixRgb, rgba } from '../../utils/color'
import type { WorldState } from '../state'
import { CLOUDS } from './scene'
import type { View } from './view'

/** Vertical squash of the horizon bloom (smaller = a glow that hugs the horizon, as a real dawn does). */
const BLOOM_FLATNESS = 0.19

/** Reach of the sun's scattering halo, as a fraction of viewport height. Kept moderate so it never washes out nearby text. */
const HALO_RADIUS = 0.4

/** Strength of the sky's grain texture (0–1). */
const GRAIN_ALPHA = 0.4

/**
 * The grain is a property of the sky, not of the sun: it is removed inside `clear` sun-disc radii (the disc and its bloom)
 * and fades back to full strength by `full` radii. Without this the translucent glow sits on top of the texture and reads as
 * a grainy sun. Kept tight on purpose: on a phone, 9 radii would already span most of the screen.
 */
const GRAIN_AROUND_SUN = { clear: 3.4, full: 6 }

/** Number of concentric rings the fade is built from (each is a clipped pattern fill at its own strength). */
const GRAIN_FADE_STEPS = 4

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

  // Paper tooth + dither for the sky itself, painted BEFORE the sun and faded out around it (see GRAIN_AROUND_SUN).
  if (grain) {
    const sunR = h * 0.027 * (1 + 0.5 * near)
    paintGrain(ctx, grain, view, sx, sy, sunR, smoothstep(0, 0.35, sun.intensity))
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

    const r = h * 0.027 * (1 + 0.5 * near) // keep in step with sunR above
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

/**
 * Fill the canvas with the grain pattern, leaving a soft hole around the sun.
 *
 * Built only from clipped pattern fills — no second canvas. (Compositing a scratch canvas into the sky canvas changed how the
 * sun's halo gradient, drawn afterwards, was rasterized out to its full radius, which a pixel diff caught.) Outside the
 * fade circle it is the same single fill as without a sun; inside, concentric rings are filled at falling-then-rising
 * strength so the texture eases out toward the sun and back in. The pattern is anchored to the canvas origin for every
 * fill, so the texture is continuous across ring boundaries. `strength` (0–1) scales how much is removed: at 0 this is
 * exactly the plain full fill, which keeps the sky identical to before whenever the sun is not up.
 */
function paintGrain(
  ctx: CanvasRenderingContext2D,
  grain: CanvasPattern,
  view: View,
  sunX: number,
  sunY: number,
  sunR: number,
  strength: number,
) {
  const { w, h, dpr } = view
  const W = w * dpr // exact extents, as the plain fill always used
  const H = h * dpr
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = grain
  ctx.globalAlpha = GRAIN_ALPHA
  if (strength < 0.001) {
    ctx.fillRect(0, 0, W, H)
    return
  }

  const cx = sunX * dpr
  const cy = sunY * dpr
  const clear = sunR * GRAIN_AROUND_SUN.clear * dpr
  const full = sunR * GRAIN_AROUND_SUN.full * dpr

  // Outside the fade circle: the plain fill. Four plain rectangles around the circle's bounding square (no clip, so no
  // full-canvas mask is built), then the square's four corners with an even-odd clip limited to the square.
  const x0 = Math.max(0, Math.floor(cx - full))
  const y0 = Math.max(0, Math.floor(cy - full))
  const x1 = Math.min(Math.floor(W), Math.ceil(cx + full))
  const y1 = Math.min(Math.floor(H), Math.ceil(cy + full))
  ctx.fillRect(0, 0, W, y0)
  ctx.fillRect(0, y1, W, H - y1)
  ctx.fillRect(0, y0, x0, y1 - y0)
  ctx.fillRect(x1, y0, W - x1, y1 - y0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, x1 - x0, y1 - y0)
  ctx.moveTo(cx + full, cy)
  ctx.arc(cx, cy, full, 0, Math.PI * 2)
  ctx.clip('evenodd')
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  ctx.restore()

  // Inside: rings from the sun outward, each a thick stroked circle painted with the pattern (a stroke needs no clip mask,
  // which is what made clipped ring fills expensive). Ring i spans [r(i), r(i+1)] at the strength the fade has at its middle.
  const radii = [0, clear]
  for (let i = 1; i <= GRAIN_FADE_STEPS; i++) radii.push(clear + ((full - clear) * i) / GRAIN_FADE_STEPS)
  ctx.strokeStyle = grain
  for (let i = 1; i < radii.length - 1; i++) {
    const t = (i - 0.5) / GRAIN_FADE_STEPS // fade position at the ring's middle (0 = inside `clear`, 1 = at `full`)
    const keep = 1 - strength * (1 - t * t * (3 - 2 * t))
    if (keep < 0.002) continue
    ctx.globalAlpha = GRAIN_ALPHA * keep
    ctx.lineWidth = radii[i + 1] - radii[i]
    ctx.beginPath()
    ctx.arc(cx, cy, (radii[i] + radii[i + 1]) / 2, 0, Math.PI * 2)
    ctx.stroke()
  }
  // Inside `clear` (the disc and its bloom) nothing is painted: that is the point.
  ctx.globalAlpha = 1
}
