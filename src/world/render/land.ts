import { DESIGN_HEIGHT } from '../../config/world'
import { mixFast, rgba, type Rgb } from '../../utils/color'
import { clamp } from '../../utils/interpolation'
import type { WorldState } from '../state'
import { shadeGround } from './ground'
import { HZ, type Scene } from './scene'
import type { View } from './view'

/** Ground-plane foreshortening of shadow length on screen. */
const PSI = 0.4

/**
 * LIGHTING MODEL — read this before changing anything below.
 *
 * Every lit surface is shaded from the same continuous quantities, never from a branch on which side the sun is on:
 *
 *   • horizontal light direction at an object:  lx = tanh((sunX − objectX) / range)     ∈ (−1, 1), smooth
 *   • how frontal the light is:                 lz = f(sun elevation)                    smooth
 *   • illumination across a surface of normal-angle u:  I(u) = (u·lx + √(1−u²)·lz) / |(lx, lz)|
 *
 * `I(u)` is sampled into gradient stops, so as the sun moves the *bright band slides across the object*; when the
 * sun passes an object's centre, lx passes through 0 and the band is momentarily centred — there is no frame
 * where one gradient is swapped for another. Shadows radiate from the point on the horizon beneath the sun, whose
 * direction is also continuous in sunX.
 */

/**
 * Shadows radiate from the point on the horizon directly beneath the sun — the correct picture when you look
 * *toward* the sun. An object right of that point throws its shadow right (and toward the viewer); crossing it,
 * the shadow swings smoothly to the other side (the direction passes through straight-down, no discontinuity).
 */
function shadowDirection(baseX: number, baseY: number, sunX: number): [number, number] {
  const gx = (baseX - sunX) * 0.9
  const gy = Math.max(baseY - HZ, 64)
  const n = Math.hypot(gx, gy)
  return [gx / n, gy / n]
}

function paintShadow(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  state: WorldState,
  opts: { x: number; y: number; scale: number; mirror: 1 | -1; lean?: number; height: number; sunX: number; length: number; opacity: number },
) {
  const { lighting } = state
  const [dx, dy] = shadowDirection(opts.x, opts.y, opts.sunX)
  const s = opts.scale
  ctx.save()
  // Local space: x across, y up (negative). Shear/flatten onto the ground along (dx, dy).
  ctx.transform(opts.mirror * s, 0, -dx * opts.length * s - opts.mirror * s * (opts.lean ?? 0), -dy * opts.length * s * PSI, opts.x, opts.y)
  const fade = ctx.createLinearGradient(0, 0, 0, -opts.height / s)
  fade.addColorStop(0, rgba(lighting.shadowColor, opts.opacity))
  fade.addColorStop(1, rgba(lighting.shadowColor, opts.opacity * 0.1))
  ctx.fillStyle = fade
  ctx.strokeStyle = fade
  ctx.lineJoin = 'round'
  // Feathered edge: wider, fainter passes. Softness grows as the light gets low and diffuse.
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.26
    ctx.lineWidth = (lighting.softness * i * 0.6) / s
    ctx.stroke(path)
  }
  ctx.globalAlpha = 1
  ctx.fill(path)
  ctx.restore()
}

export function drawLand(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  state: WorldState,
  view: View,
  grain: CanvasPattern | null,
) {
  const { w, h, dpr, k, widthD } = view
  const { terrain: T, lighting: L, sky, sun } = state
  const haze: Rgb = sky.haze
  const atm = sky.atmosphere
  const direct = L.direct
  const sunX = sun.x * widthD
  const elev = clamp(sun.elevation)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, w * dpr + 2, h * dpr + 2)
  ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)

  // ── Distant ranges: flat, pale, low-contrast — they are mostly atmosphere ─
  // Far rock dissolves into the blue of distance (haze tempered with the sky), not into the warm horizon glow.
  const distance = mixFast(haze, sky.mid, 0.5)
  for (const r of scene.farRanges) {
    const base = mixFast(T.far, distance, r.haze * (0.45 + 0.55 * atm))
    const g = ctx.createLinearGradient(0, r.top, 0, HZ + 24)
    g.addColorStop(0, rgba(mixFast(base, T.rim, 0.05 * direct)))
    g.addColorStop(1, rgba(mixFast(base, haze, 0.6)))
    ctx.fillStyle = g
    ctx.fill(r.fill)
  }

  // ── Formations ───────────────────────────────────────────────────────
  for (const m of scene.mesas) {
    // Distance: contrast, saturation and relief all fall away toward the horizon.
    const contrast = 1 - m.depth * 0.6
    const base = mixFast(T.mesa, haze, m.depth * (0.4 + 0.6 * atm) * 0.9)
    const shade = mixFast(base, L.shadowColor, 0.52 * contrast)
    const lit = mixFast(base, T.rim, (0.08 + 0.28 * direct) * contrast)

    // Continuous light direction for this object (see the model note at the top of the file).
    const lx = Math.tanh((sunX - m.cx) / (0.28 * widthD))
    const lz = 0.16 + 0.3 * elev // looking toward the sun, rock faces are mostly backlit

    ctx.save()
    ctx.translate(m.cx, m.base)
    const half = m.width / 2
    const face = ctx.createLinearGradient(-half * 1.3, 0, half * 1.3, 0)
    const STOPS = 15
    for (let i = 0; i < STOPS; i++) {
      const u = -1.3 + (2.6 * i) / (STOPS - 1)
      const uc = clamp(u, -1, 1)
      const I = Math.max(0, uc * lx * 0.95 + Math.sqrt(1 - uc * uc) * lz)
      const c = mixFast(shade, lit, clamp(I * (0.35 + 0.65 * direct)))
      face.addColorStop(i / (STOPS - 1), rgba(c))
    }
    ctx.fillStyle = face
    ctx.fill(m.path)

    // Rim light on every edge that faces the light — ledges, shoulders, the crest. Tint the silhouette, then cover all
    // but a sliver with the face colour, offset away from the sun. The offset is ∝ lx (and a little upward), so the
    // glow thickens/thins through zero as the sun passes: it follows the real outline and never switches sides.
    // Its strength comes from direct sun plus the horizon glow, so before sunrise it is a faint coloured edge.
    const rimAmount = clamp(0.85 * direct + 0.5 * sun.glowStrength * (1 - direct)) * contrast
    if (rimAmount > 0.01) {
      const S = 2.6 + 3 * (1 - contrast)
      ctx.save()
      ctx.clip(m.path)
      ctx.fillStyle = rgba(T.rim, 0.5 * rimAmount)
      ctx.fillRect(-m.width, -m.height * 1.2, m.width * 2, m.height * 1.3)
      ctx.translate(-lx * S, S * 0.25)
      ctx.fillStyle = face
      ctx.fill(m.path)
      ctx.restore()
    }

    ctx.save()
    ctx.clip(m.path)
    // Irregular tonal strata (soft, unruled) …
    const strata = ctx.createLinearGradient(0, -m.height, 0, 0)
    for (const b of m.bands) {
      const a = Math.abs(b.tone) * 0.13 * contrast
      const color = b.tone < 0 ? rgba(L.shadowColor, a) : rgba(T.rim, a * (0.3 + 0.7 * direct))
      strata.addColorStop(clamp(b.pos - 0.05), rgba(L.shadowColor, 0))
      strata.addColorStop(b.pos, color)
      strata.addColorStop(clamp(b.pos + 0.06), rgba(L.shadowColor, 0))
    }
    ctx.fillStyle = strata
    ctx.fill(m.path)
    // … erosion gullies …
    const streak = ctx.createLinearGradient(0, -m.height, 0, 0)
    streak.addColorStop(0, rgba(L.shadowColor, 0.16 * contrast))
    streak.addColorStop(0.3, rgba(L.shadowColor, 0.07 * contrast))
    streak.addColorStop(0.55, rgba(L.shadowColor, 0))
    ctx.fillStyle = streak
    ctx.fill(m.gullies)
    // … and the foot dissolving into the horizon haze.
    const foot = ctx.createLinearGradient(0, -m.height, 0, 0)
    foot.addColorStop(0, rgba(haze, 0))
    foot.addColorStop(0.55, rgba(haze, 0))
    foot.addColorStop(1, rgba(haze, 0.55 * atm * (0.2 + 0.8 * m.depth))) // near rock carries little atmosphere
    ctx.fillStyle = foot
    ctx.fill(m.path)
    ctx.restore()
    ctx.restore()
  }

  // ── Horizon mist ─────────────────────────────────────────────────────
  {
    const mist = ctx.createLinearGradient(0, HZ - 90, 0, HZ + 70)
    mist.addColorStop(0, rgba(haze, 0))
    mist.addColorStop(0.58, rgba(haze, 0.06 + 0.3 * atm))
    mist.addColorStop(1, rgba(haze, 0))
    ctx.fillStyle = mist
    ctx.fillRect(-20, HZ - 90, widthD + 40, 160)
  }

  // ── Midground hills ──────────────────────────────────────────────────
  {
    const base = mixFast(T.hills, haze, 0.16 + 0.3 * atm)
    const g = ctx.createLinearGradient(0, scene.hills.top, 0, HZ + 120)
    g.addColorStop(0, rgba(mixFast(base, T.rim, 0.1 * direct)))
    g.addColorStop(1, rgba(mixFast(base, T.groundBack, 0.6)))
    ctx.fillStyle = g
    ctx.fill(scene.hills.fill)
  }

  // ── Desert floor: a lit heightfield, shaded by the same sun ──────────
  {
    const g = scene.ground
    shadeGround(g, state, widthD)
    ctx.save()
    ctx.clip(scene.groundEdge.fill)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(g.canvas, g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0)
    ctx.restore()
  }

  // ── Shadows (one geometry, driven by the sun) ────────────────────────
  if (L.shadowOpacity > 0.008) {
    for (const m of scene.mesas) {
      paintShadow(ctx, m.path, state, {
        x: m.cx,
        y: m.base,
        scale: 1,
        mirror: 1,
        height: m.height,
        sunX,
        length: Math.min(L.shadowLength * 0.4, 1.6),
        opacity: L.shadowOpacity * 0.62 * (1 - m.depth * 0.7),
      })
    }
    for (const c of scene.cacti) {
      paintShadow(ctx, c.shape.body, state, {
        x: c.x,
        y: c.baseY,
        scale: c.height / 100,
        mirror: c.mirror,
        lean: c.lean,
        height: c.height,
        sunX,
        length: L.shadowLength * (0.3 + 0.7 * c.depth) ** 2.2, // far plants: foreshortened, short shadows
        opacity: L.shadowOpacity * (0.4 + 0.6 * c.depth),
      })
    }
  }

  // ── Cacti, far → near ────────────────────────────────────────────────
  const rimStrength = clamp(0.3 + 0.7 * direct)
  for (const c of [...scene.cacti].sort((a, b) => a.baseY - b.baseY)) {
    const s = c.height / 100
    const far = (1 - c.depth) * 0.6 * atm
    const col = mixFast(T.cactus, haze, far)
    const top = mixFast(col, T.rim, 0.14 * direct * c.depth)
    const foot = mixFast(col, L.shadowColor, 0.35)
    // Local x flips with `mirror`; keep the light direction in the same frame.
    const lx = Math.tanh((sunX - c.x) / (0.3 * widthD)) * c.mirror
    ctx.save()
    ctx.translate(c.x, c.baseY)
    ctx.save() // contact shadow grounds the plant even when the sun is gone
    ctx.scale(1, 0.16)
    ctx.fillStyle = rgba(L.shadowColor, 0.3)
    ctx.beginPath()
    ctx.arc(0, 0, c.height * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.transform(c.mirror * s, 0, -c.mirror * s * c.lean, s, 0, 0)
    const body = ctx.createLinearGradient(0, -100, 0, 0)
    body.addColorStop(0, rgba(top))
    body.addColorStop(1, rgba(foot))
    ctx.fillStyle = body
    ctx.fill(c.shape.body)
    // Rim light: tint the body, then cover all but a sliver with the body colour. The sliver's width is
    // proportional to the continuous light direction, so it grows/shrinks through zero instead of switching sides.
    ctx.save()
    ctx.clip(c.shape.body)
    ctx.fillStyle = rgba(T.rim, 0.5 * rimStrength * (1 - far))
    ctx.fillRect(-60, -110, 120, 115)
    ctx.translate(-lx * Math.max(1.1, 0.9 / s), 0)
    ctx.fillStyle = body
    ctx.fill(c.shape.body)
    ctx.restore()
    if (s > 1.6) {
      ctx.strokeStyle = rgba(L.shadowColor, 0.26)
      ctx.lineWidth = 0.9
      ctx.stroke(c.shape.ribs)
    }
    ctx.restore()
  }

  // ── Light, applied only where land exists ────────────────────────────
  ctx.globalCompositeOperation = 'source-atop'
  {
    // Warm light pooling toward the sun.
    const wash = (sun.glowStrength * (0.3 + 0.7 * direct)) ** 1.1 * 0.38
    ctx.save()
    ctx.translate(sunX, HZ + 20)
    ctx.scale(1, 0.5)
    const R = Math.max(widthD * 0.55, 620)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
    g.addColorStop(0, rgba(sun.glow, wash))
    g.addColorStop(0.5, rgba(sun.glow, wash * 0.35))
    g.addColorStop(1, rgba(sun.glow, 0))
    ctx.fillStyle = g
    ctx.fillRect(-R, -R, R * 2, R * 2)
    ctx.restore()

    // Aerial perspective hugging the horizon.
    const veil = ctx.createLinearGradient(0, HZ - 150, 0, HZ + 240)
    veil.addColorStop(0, rgba(haze, 0))
    veil.addColorStop(0.4, rgba(haze, 0.2 * atm))
    veil.addColorStop(1, rgba(haze, 0))
    ctx.fillStyle = veil
    ctx.fillRect(-20, HZ - 150, widthD + 40, 400)

    // Foreground falls into shade; also gives the card layer a calm ground to sit on.
    const fg = ctx.createLinearGradient(0, HZ + 120, 0, DESIGN_HEIGHT)
    fg.addColorStop(0, rgba(L.shadowColor, 0))
    fg.addColorStop(1, rgba(L.shadowColor, 0.7))
    ctx.fillStyle = fg
    ctx.fillRect(-20, HZ + 120, widthD + 40, DESIGN_HEIGHT - HZ)
  }

  if (grain) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.5
    ctx.fillStyle = grain
    ctx.fillRect(0, 0, w * dpr, h * dpr)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
