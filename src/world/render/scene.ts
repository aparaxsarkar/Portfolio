import { DESIGN_HEIGHT, HORIZON } from '../../config/world'
import { clamp } from '../../utils/interpolation'
import { createFbm1D, createRng } from '../../utils/random'
import { buildGround, type GroundField } from './ground'

/**
 * Landscape geometry. Authored in a design space that is 900 units tall (the width follows the viewport's
 * aspect), built once per width and reused every frame — the lighting changes, the land does not. Everything is
 * seeded, so a given viewport always paints the same desert.
 *
 * Composition, near → far:  a few foreground silhouettes · the lit desert floor · irregular eroded formations ·
 * hazy distant ranges · the horizon.
 */

export const HZ = HORIZON * DESIGN_HEIGHT

type Anchor = 'left' | 'right' | 'frac'
const place = (anchor: Anchor, x: number, widthD: number) =>
  anchor === 'left' ? x : anchor === 'right' ? widthD - x : x * widthD

// ── Ridges (distant ranges, midground hills, the floor's far edge) ───────

export interface Ridge {
  fill: Path2D
  /** Highest point (smallest y) of the ridge. */
  top: number
}

const gauss = (u: number, centre: number, width: number) => Math.exp(-(((u - centre) / width) ** 2))

function buildRidge(
  widthD: number,
  opts: {
    seed: number
    baseY: number
    amp: number
    freq: number
    octaves?: number
    sharp?: number
    env?: (u: number) => number
  },
): Ridge {
  const fbm = createFbm1D(opts.seed, opts.octaves ?? 4)
  const fill = new Path2D()
  const bottom = DESIGN_HEIGHT + 40
  let top = opts.baseY
  fill.moveTo(-24, bottom)
  for (let x = -24; x <= widthD + 24; x += 5) {
    const n = fbm(x * opts.freq)
    const shaped = clamp((n - 0.3) * 2.1) ** (opts.sharp ?? 1)
    const y = opts.baseY - opts.amp * (opts.env ? opts.env(x / widthD) : 1) * shaped
    top = Math.min(top, y)
    fill.lineTo(x, y)
  }
  fill.lineTo(widthD + 24, bottom)
  fill.closePath()
  return { fill, top }
}

// High at the edges, low through the centre-right where the sun sets.
const rangeEnvelope = (u: number) =>
  0.16 + 0.84 * Math.max(gauss(u, 0.06, 0.24), 0.9 * gauss(u, 0.97, 0.2), 0.3 * gauss(u, 0.5, 0.1))

// ── Eroded formations ────────────────────────────────────────────────────

export interface Mesa {
  /** Silhouette in local coordinates: origin at the foot centre, y negative upward. */
  path: Path2D
  /** Erosion gullies and ledges, drawn as soft shade inside the silhouette. */
  gullies: Path2D
  /** Soft tonal strata (position 0 = top … 1 = foot, tone −1 dark … +1 light). Irregular, not ruled lines. */
  bands: { pos: number; tone: number }[]
  cx: number
  base: number
  width: number
  height: number
  /** 0 = near, 1 = far. Drives atmospheric perspective. */
  depth: number
}

interface MesaDef {
  anchor: Anchor
  x: number
  w: number
  h: number
  base: number
  depth: number
  seed: number
  /** −1…1: which way the top edge rises. */
  tilt: number
  leftWall: 'cliff' | 'slope'
  rightWall: 'cliff' | 'slope'
  ledges: number
  minWidth?: number
  /** Overrides applied on portrait viewports, where the masses are pushed to the edges to keep the sunrise saddle open. */
  narrow?: Partial<Omit<MesaDef, 'narrow'>>
}

const MESA_DEFS: MesaDef[] = [
  // Big, near mass on the left: sheer face on the left, long eroded slope falling away to the right.
  { anchor: 'left', x: 110, w: 680, h: 300, base: HZ + 34, depth: 0.12, seed: 3, tilt: 0.3, leftWall: 'cliff', rightWall: 'slope', ledges: 2, narrow: { x: -30, w: 470, h: 250, rightWall: 'cliff' } },
  // A smaller, hazier butte toward the centre: sheer, stepped face on the left, a broken shoulder falling away to the right.
  { anchor: 'left', x: 760, w: 210, h: 142, base: HZ + 12, depth: 0.55, seed: 5, tilt: 0.5, leftWall: 'cliff', rightWall: 'slope', ledges: 2, minWidth: 900 },
  // Right: a broad formation with a sheer, stepped face turned toward the centre. Pulled right so the open saddle
  // between it and the butte frames the sunrise.
  { anchor: 'right', x: 118, w: 480, h: 236, base: HZ + 26, depth: 0.28, seed: 8, tilt: -0.35, leftWall: 'cliff', rightWall: 'slope', ledges: 2, narrow: { x: -70, w: 250, h: 190 } },
]

function buildMesa(raw: MesaDef, widthD: number, K: number): Mesa {
  const def = { ...raw, w: raw.w * K, h: raw.h * K }
  const rng = createRng(def.seed * 101)
  const fbm = createFbm1D(def.seed * 7 + 1, 3)
  const half = def.w / 2
  // Distant formations are smoother; near ones carry more broken detail.
  const detail = 1 - def.depth * 0.65

  // A flattish crown with a tilt and one broken step, rather than a peak.
  const stepU = rng.range(-0.3, 0.4)
  const stepDrop = def.h * rng.range(0.04, 0.09) * (rng() > 0.5 ? 1 : -1)
  const topAt = (u: number) => {
    const s = clamp((u - stepU) / 0.16)
    return (
      -def.h * (0.9 + 0.08 * def.tilt * u) +
      stepDrop * (s * s * (3 - 2 * s)) +
      (fbm(u * 3.4 + 2) - 0.5) * def.h * 0.08 * detail
    )
  }

  // Walls descend as a run of faces and benches. Cliffs: tall, near-vertical faces and narrow ledges.
  // Slopes: short, inclined faces and wide benches — terraced scree. Both get erosion bites and wobble.
  const wall = (sign: 1 | -1, style: 'cliff' | 'slope'): [number, number][] => {
    const pts: [number, number][] = []
    const topU = 0.7 + rng.range(-0.06, 0.05)
    let hw = half * topU
    let y = topAt(sign * topU)
    const yFloor = -def.h * 0.08
    pts.push([sign * hw, y])
    const nFaces = style === 'cliff' ? def.ledges + 1 : def.ledges + 3
    const weights = Array.from({ length: nFaces }, (_, i) => (style === 'cliff' && i === 0 ? 2.4 : 0.6) + rng())
    for (let f = 0; f < nFaces; f++) {
      const drop = ((yFloor - y) * weights[f]) / (weights.reduce((a, b, i) => (i >= f ? a + b : a), 0))
      const yEnd = y + drop
      const lean = style === 'cliff' ? rng.range(-0.03, 0.06) : rng.range(0.15, 0.42)
      const steps = 3
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        const wob = (fbm(Math.abs(y + drop * t) * 0.02 + sign * 5 + f) - 0.5) * def.w * 0.08 * (0.5 + 0.5 * detail)
        pts.push([sign * (hw - lean * (drop * t) * -1 + wob), y + drop * t])
      }
      hw += Math.abs(lean * drop)
      y = yEnd
      // erosion bite: a small inward notch in the face
      if (detail > 0.5 && rng() < 0.5) {
        pts.push([sign * (hw - def.w * rng.range(0.02, 0.05)), y - drop * 0.35])
        pts.push([sign * (hw + def.w * 0.005), y - drop * 0.22])
      }
      if (f < nFaces - 1) {
        const run = (style === 'cliff' ? rng.range(0.025, 0.08) : rng.range(0.05, 0.16)) * def.w
        pts.push([sign * (hw + run * 0.6), y + rng.range(0, 4)])
        hw += run
        pts.push([sign * hw, y + rng.range(2, 7)])
      }
    }
    // Foot: a concave talus apron spreading onto the floor.
    const [lx, ly] = pts[pts.length - 1]
    for (let s = 1; s <= 4; s++) {
      const t = s / 4
      pts.push([lx + sign * def.w * 0.2 * t ** 1.2, ly * (1 - t) ** 1.8])
    }
    return pts
  }

  const left = wall(-1, def.leftWall)
  const right = wall(1, def.rightWall)
  const path = new Path2D()
  path.moveTo(left[left.length - 1][0], left[left.length - 1][1])
  for (let i = left.length - 2; i >= 0; i--) path.lineTo(left[i][0], left[i][1])
  // Broken top edge between the two shoulders.
  const uL = left[0][0] / half
  const uR = right[0][0] / half
  for (let u = uL; u < uR; u += 0.06) path.lineTo(u * half, topAt(u))
  for (const [x, y] of right) path.lineTo(x, y)
  path.closePath()

  // Gullies: tapering wedges cut down from the crest.
  const gullies = new Path2D()
  const gullyCount = Math.round((def.w / 150) * detail)
  for (let i = 0; i < gullyCount; i++) {
    const u = rng.range(uL * 0.9, uR * 0.9)
    const x = u * half
    const y0 = topAt(u)
    const len = def.h * rng.range(0.12, 0.38)
    const wt = rng.range(5, 12) * (0.5 + detail)
    gullies.moveTo(x - wt, y0)
    gullies.lineTo(x + wt, y0)
    gullies.lineTo(x + rng.range(-5, 5), y0 + len)
    gullies.closePath()
  }

  const bands = Array.from({ length: 7 }, () => ({ pos: rng(), tone: rng.range(-1, 1) * (0.35 + 0.65 * detail) })).sort(
    (a, b) => a.pos - b.pos,
  )

  return {
    path,
    gullies,
    bands,
    cx: place(def.anchor, def.x * K, widthD),
    base: def.base,
    width: def.w,
    height: def.h,
    depth: def.depth,
  }
}

// ── Cacti ────────────────────────────────────────────────────────────────

/** Saguaro silhouettes, 100 units tall, origin at the base, y negative upward. */
export interface CactusShape {
  body: Path2D
  ribs: Path2D
}

function saguaro(arms: { side: -1 | 1; reach: number; low: number; high: number }[], trunkW = 12): CactusShape {
  const body = new Path2D()
  const ribs = new Path2D()
  const r = trunkW / 2
  body.roundRect(-r, -100, trunkW, 100, r)
  ribs.moveTo(-r * 0.38, -94)
  ribs.lineTo(-r * 0.38, -4)
  ribs.moveTo(r * 0.38, -94)
  ribs.lineTo(r * 0.38, -4)
  const armW = trunkW * 0.72
  for (const a of arms) {
    const x0 = a.side * (r - 1)
    const x1 = a.side * (r + a.reach)
    const [xa, xb] = x0 < x1 ? [x0, x1 + armW / 2] : [x1 - armW / 2, x0]
    body.roundRect(xa, -a.low - armW, xb - xa, armW, armW / 2) // elbow
    const vx = a.side * (r + a.reach) - armW / 2
    body.roundRect(vx, -a.high, armW, a.high - a.low + armW * 0.4, armW / 2) // upright
    ribs.moveTo(vx + armW / 2, -a.high + 4)
    ribs.lineTo(vx + armW / 2, -a.low)
  }
  return { body, ribs }
}

export const CACTUS_SHAPES: CactusShape[] = [
  saguaro([
    { side: -1, reach: 15, low: 38, high: 70 },
    { side: 1, reach: 11, low: 60, high: 82 },
  ]),
  saguaro([{ side: 1, reach: 17, low: 46, high: 80 }]),
  saguaro(
    [
      { side: -1, reach: 12, low: 28, high: 52 },
      { side: 1, reach: 18, low: 54, high: 72 },
    ],
    13,
  ),
  saguaro([], 15),
]

export interface CactusInstance {
  shape: CactusShape
  x: number
  baseY: number
  height: number
  mirror: 1 | -1
  /** Lean as a horizontal shear of the top (fraction of height). */
  lean: number
  /** 0 = far … 1 = foreground. Drives atmospheric perspective. */
  depth: number
}

interface CactusDef {
  anchor: Anchor
  x: number
  baseY: number
  h: number
  shape: number
  mirror?: 1 | -1
  lean?: number
  depth: number
  minWidth?: number
}

// Deliberately sparse: two foreground silhouettes framing the edges, a small loose group in the midground, two far ones.
const CACTUS_DEFS: CactusDef[] = [
  { anchor: 'left', x: 54, baseY: 896, h: 352, shape: 0, lean: -0.035, depth: 1 },
  { anchor: 'right', x: 96, baseY: 888, h: 262, shape: 1, mirror: -1, lean: 0.03, depth: 1 },
  { anchor: 'left', x: 438, baseY: 738, h: 100, shape: 2, lean: 0.02, depth: 0.7, minWidth: 560 },
  { anchor: 'left', x: 492, baseY: 750, h: 64, shape: 3, lean: -0.03, depth: 0.7, minWidth: 560 },
  { anchor: 'right', x: 468, baseY: 744, h: 84, shape: 0, mirror: -1, lean: 0.02, depth: 0.66, minWidth: 700 },
  { anchor: 'frac', x: 0.34, baseY: HZ + 64, h: 50, shape: 1, depth: 0.32 },
  { anchor: 'frac', x: 0.585, baseY: HZ + 50, h: 36, shape: 3, depth: 0.25, minWidth: 600 },
]

// ── Scene ────────────────────────────────────────────────────────────────

export interface Scene {
  widthD: number
  farRanges: (Ridge & { haze: number })[]
  mesas: Mesa[]
  hills: Ridge
  /** Organic far edge of the desert floor (the floor itself is a lit heightfield). */
  groundEdge: Ridge
  ground: GroundField
  cacti: CactusInstance[]
}

/** Portrait viewports (design width below this) get the `narrow` formation overrides. */
const NARROW_WIDTH = 700

export function buildScene(widthD: number): Scene {
  const wide = (min?: number) => min === undefined || widthD >= min
  const narrow = widthD < NARROW_WIDTH
  // Narrow (portrait) viewports show a slice of the same world: shrink big features so they stay in proportion.
  const K = clamp(widthD / 1100, 0.62, 1)
  return {
    widthD,
    farRanges: [
      { ...buildRidge(widthD, { seed: 31, baseY: HZ + 6, amp: 175, freq: 0.0046, octaves: 5, sharp: 1.15, env: rangeEnvelope }), haze: 0.78 },
      { ...buildRidge(widthD, { seed: 37, baseY: HZ + 8, amp: 105, freq: 0.0062, octaves: 5, sharp: 1.25, env: (u) => rangeEnvelope(1 - u * 0.9) }), haze: 0.56 },
    ],
    mesas: MESA_DEFS.filter((d) => wide(d.minWidth)).map((d) => buildMesa(narrow && d.narrow ? { ...d, ...d.narrow } : d, widthD, K)),
    hills: buildRidge(widthD, { seed: 41, baseY: HZ + 8, amp: 36, freq: 0.0054, octaves: 3 }),
    groundEdge: buildRidge(widthD, { seed: 23, baseY: HZ + 40, amp: 34, freq: 0.0032, octaves: 3 }),
    ground: buildGround(widthD),
    cacti: CACTUS_DEFS.filter((d) => wide(d.minWidth)).map((d) => ({
      shape: CACTUS_SHAPES[d.shape],
      x: place(d.anchor, d.x, widthD),
      baseY: d.baseY,
      height: d.h * (d.depth > 0.5 ? K : 1),
      mirror: d.mirror ?? 1,
      lean: d.lean ?? 0,
      depth: d.depth,
    })),
  }
}

// ── Clouds (sky) ─────────────────────────────────────────────────────────

export interface CloudDef {
  /** Fraction of width. */
  u: number
  /** Design-space y. */
  y: number
  len: number
  thick: number
}

export const CLOUDS: CloudDef[] = [
  { u: 0.16, y: 176, len: 360, thick: 9 },
  { u: 0.62, y: 132, len: 440, thick: 10 },
  { u: 0.84, y: 252, len: 380, thick: 8 },
  { u: 0.4, y: 338, len: 480, thick: 7 },
  { u: 0.08, y: 326, len: 300, thick: 6 },
]
