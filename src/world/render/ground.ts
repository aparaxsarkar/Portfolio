import { DESIGN_HEIGHT, HORIZON } from '../../config/world'
import { desaturate, mixFast } from '../../utils/color'
import { clamp, smoothstep } from '../../utils/interpolation'
import { createNoise2D } from '../../utils/random'
import type { WorldState } from '../state'

/**
 * The desert floor as a tiny lit heightfield rather than a stack of vector paths.
 *
 * A seeded 2-D height function (domain-warped, stretched along x so dunes read as broad, long masses) is sampled
 * once per viewport width on a coarse grid in ground-plane coordinates — so features are large and soft up close
 * and finer toward the horizon. From it we keep only per-cell surface normals and a patchiness value.
 *
 * Every frame each cell is lit by the *same* sun as everything else: the light direction at a cell is
 * `tanh((sunX − x)/range)` — continuous in the sun's position — combined with a height derived from its
 * elevation. The result is upscaled with bilinear filtering, which is what gives it a painted, tonal look:
 * soft regions of light and shade that slide across the dunes as the sun moves, with no outlines.
 */

const HZ = HORIZON * DESIGN_HEIGHT
const GW = 224
const GH = 112
const RELIEF = 104 // design px of vertical relief the height field represents
const FORESHORTEN = 2.4 // the ground plane is foreshortened on screen, so slopes along y read steeper

export interface GroundField {
  x0: number
  x1: number
  y0: number
  y1: number
  colX: Float32Array
  depth: Float32Array // per row, 0 at the horizon → 1 at the bottom of the screen
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  tone: Float32Array // 0..1 patchiness (sand vs. sage)
  canvas: HTMLCanvasElement
  image: ImageData
}

export function buildGround(widthD: number): GroundField {
  const noise = createNoise2D(4417)
  const patch = createNoise2D(9091)
  const x0 = -8
  const x1 = widthD + 8
  const y0 = HZ - 6
  const y1 = DESIGN_HEIGHT + 6
  const dx = (x1 - x0) / GW
  const dy = (y1 - y0) / GH

  const H = new Float32Array(GW * GH)
  const tone = new Float32Array(GW * GH)
  const colX = new Float32Array(GW)
  const depth = new Float32Array(GH)
  for (let i = 0; i < GW; i++) colX[i] = x0 + (i + 0.5) * dx
  for (let j = 0; j < GH; j++) depth[j] = clamp((y0 + (j + 0.5) * dy - HZ) / (DESIGN_HEIGHT - HZ))

  for (let j = 0; j < GH; j++) {
    const t = depth[j]
    const z = 1 / (0.16 + 0.84 * t) // ground distance (capped so far rows are not sampled finer than the grid)
    const detail = smoothstep(0, 0.45, t) // distance simplifies the surface instead of aliasing it
    for (let i = 0; i < GW; i++) {
      const gx = ((colX[i] - widthD / 2) / (widthD * 0.5)) * z * 0.85
      const gz = z * 1.25
      // Rotate the dune field ~24° so crests run diagonally across the view: terrain, not horizontal bands.
      const wx = gx * 0.91 + gz * 0.41
      const wz = -gx * 0.41 * 0.7 + gz * 0.91
      const warp = (noise(wx * 0.33 + 11, wz * 0.33) - 0.5) * 2.2
      const a = noise(wx * 0.55 + warp, wz * 0.3)
      const ridged = 1 - Math.abs(2 * noise(wx * 0.8 + 40 + warp * 0.6, wz * 0.38 + 7) - 1)
      const b = noise(wx * 1.7, wz * 0.8 + 20)
      const c = noise(wx * 3.6, wz * 1.7 + 9)
      H[j * GW + i] = a * 0.5 + ridged * ridged * 0.38 + (b * 0.18 + c * 0.05) * detail
      tone[j * GW + i] = smoothstep(0.38, 0.72, patch(wx * 0.4 + 3, wz * 0.22) * 0.75 + c * 0.25)
    }
  }

  const nx = new Float32Array(GW * GH)
  const ny = new Float32Array(GW * GH)
  const nz = new Float32Array(GW * GH)
  for (let j = 0; j < GH; j++) {
    const tilt = 0.3 + 0.7 * depth[j] // distant relief flattens into the haze
    for (let i = 0; i < GW; i++) {
      const il = Math.max(0, i - 1)
      const ir = Math.min(GW - 1, i + 1)
      const ju = Math.max(0, j - 1)
      const jd = Math.min(GH - 1, j + 1)
      const hx = ((H[j * GW + ir] - H[j * GW + il]) * RELIEF) / ((ir - il) * dx)
      const hj = ((H[jd * GW + i] - H[ju * GW + i]) * RELIEF * FORESHORTEN) / ((jd - ju) * dy)
      // Surface z = H(x, back); j grows toward the viewer, so ∂H/∂back = −∂H/∂j.
      let ax = -hx * tilt
      let ay = hj * tilt
      const az = 1
      const n = Math.hypot(ax, ay, az)
      ax /= n
      ay /= n
      const k = j * GW + i
      nx[k] = ax
      ny[k] = ay
      nz[k] = az / n
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = GW
  canvas.height = GH
  const image = canvas.getContext('2d')!.createImageData(GW, GH)
  return { x0, x1, y0, y1, colX, depth, nx, ny, nz, tone, canvas, image }
}

/** Light the floor for the current world state and upload it to the field's canvas. */
export function shadeGround(field: GroundField, state: WorldState, widthD: number) {
  const { terrain: T, lighting: L, sky, sun } = state
  const sunX = sun.x * widthD
  const direct = L.direct
  const atm = sky.atmosphere
  const haze = sky.haze
  const lz0 = 0.2 + 0.9 * clamp(sun.elevation, 0, 1)

  // Per-column light direction: continuous in the sun's x (no sign tests, no thresholds).
  const lx = new Float32Array(GW)
  const ly = 0.85
  const lzs = new Float32Array(GW)
  const ln = new Float32Array(GW)
  for (let i = 0; i < GW; i++) {
    const x = Math.tanh((sunX - field.colX[i]) / (0.5 * widthD)) * 0.85
    lx[i] = x
    lzs[i] = lz0
    ln[i] = 1 / Math.hypot(x, ly, lz0)
  }

  const shadeAmount = 0.24 + 0.44 * direct
  const litAmount = 0.04 + 0.18 * direct
  const data = field.image.data
  for (let j = 0; j < GH; j++) {
    const t = field.depth[j]
    const rowBase = desaturate(mixFast(T.groundBack, T.groundFront, t ** 0.8), (1 - t) ** 1.6 * 0.4)
    const hazeAmt = (1 - t) ** 1.7 * 0.6 * atm
    for (let i = 0; i < GW; i++) {
      const k = j * GW + i
      const d = (field.nx[k] * lx[i] + field.ny[k] * ly + field.nz[k] * lzs[i]) * ln[i]
      const I = clamp(0.5 + 0.62 * d)
      const sg = field.tone[k] * 0.4
      const br = rowBase[0] + (T.sage[0] - rowBase[0]) * sg
      const bg = rowBase[1] + (T.sage[1] - rowBase[1]) * sg
      const bb = rowBase[2] + (T.sage[2] - rowBase[2]) * sg
      // shade tone (cool, toward the shadow colour) ↔ lit tone (warm, toward the rim light)
      const w = I * (0.3 + 0.7 * direct)
      const sr = br + (L.shadowColor[0] - br) * shadeAmount
      const sgc = bg + (L.shadowColor[1] - bg) * shadeAmount
      const sb = bb + (L.shadowColor[2] - bb) * shadeAmount
      const lr = br + (T.rim[0] - br) * litAmount
      const lg = bg + (T.rim[1] - bg) * litAmount
      const lb = bb + (T.rim[2] - bb) * litAmount
      let r = sr + (lr - sr) * w
      let g = sgc + (lg - sgc) * w
      let b = sb + (lb - sb) * w
      r += (haze[0] - r) * hazeAmt
      g += (haze[1] - g) * hazeAmt
      b += (haze[2] - b) * hazeAmt
      const o = k * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = 255
    }
  }
  field.canvas.getContext('2d')!.putImageData(field.image, 0, 0)
}
