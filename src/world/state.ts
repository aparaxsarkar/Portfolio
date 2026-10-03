import { HORIZON, SUN_ELEVATION_REF_Y, SUN_PATH } from '../config/world'
import {
  hexToRgb,
  labHue,
  labToRgb,
  mixFast,
  oklch,
  rgbToLab,
  rgba,
  type Rgb,
} from '../utils/color'
import { clamp, createChannelSampler, lerp, smoothstep } from '../utils/interpolation'
import { FRAMES, STOPS, type Keyframe } from './keyframes'

/**
 * The canonical environment. Everything the viewer sees — sun, sky, light,
 * shadows, stars, even the hue of the UI panels — is a pure function of one
 * number: `progress ∈ [0, 1]`. Nothing here is time-based or stateful, so
 * scrolling backwards reproduces every frame exactly.
 */
export interface WorldState {
  progress: number
  sun: {
    /** Viewport fractions. */
    x: number
    y: number
    /** 1 when the sun is fully elevated, ≤ 0 below the horizon. */
    elevation: number
    intensity: number
    color: Rgb
    glow: Rgb
    glowStrength: number
  }
  sky: { top: Rgb; mid: Rgb; horizon: Rgb; haze: Rgb; atmosphere: number }
  terrain: Record<'far' | 'mesa' | 'hills' | 'sage' | 'groundBack' | 'groundFront' | 'cactus' | 'rim' | 'cloud', Rgb>
  lighting: {
    /** Strength of direct sunlight (0 once the sun is well below the horizon). */
    direct: number
    shadowLength: number
    shadowOpacity: number
    softness: number
    shadowColor: Rgb
  }
  stars: { opacity: number }
  shootingStars: { activity: number }
  /** CSS custom properties consumed by the UI layer. */
  ui: Record<string, string>
}

const COLOR_KEYS = [
  'skyTop',
  'skyMid',
  'skyHorizon',
  'sun',
  'glow',
  'far',
  'mesa',
  'hills',
  'sage',
  'groundBack',
  'groundFront',
  'cactus',
  'rim',
  'shadow',
  'cloud',
] as const satisfies readonly (keyof Keyframe)[]

const SCALAR_KEYS = [
  'sunIntensity',
  'glowStrength',
  'haze',
  'stars',
  'shooting',
  'cardL',
  'cardC',
] as const satisfies readonly (keyof Keyframe)[]

const rows = FRAMES.map((f) => [
  ...COLOR_KEYS.flatMap((k) => rgbToLab(hexToRgb(f[k] as string))),
  ...SCALAR_KEYS.map((k) => f[k] as number),
])
const sample = createChannelSampler(STOPS, rows)
const scalarBase = COLOR_KEYS.length * 3

/** The sun's position at a given progress. Rises, then holds: flat for progress ≥ `riseEnd`. */
export function sunPosition(progress: number) {
  const { x0, x1, yHidden, yRisen, riseStart, riseEnd } = SUN_PATH
  const t = smoothstep(riseStart, riseEnd, progress)
  return { x: lerp(x0, x1, t), y: lerp(yHidden, yRisen, t) }
}

export function computeWorld(progressIn: number): WorldState {
  const progress = clamp(progressIn)
  const v = sample(progress)
  const labAt = (i: number): [number, number, number] => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]]
  const col = (key: (typeof COLOR_KEYS)[number]) => labToRgb(labAt(COLOR_KEYS.indexOf(key)))
  const scalar = (key: (typeof SCALAR_KEYS)[number]) => v[scalarBase + SCALAR_KEYS.indexOf(key)]

  // ── Sun ────────────────────────────────────────────────────────────────
  const { x, y } = sunPosition(progress)
  const elevation = (HORIZON - y) / (HORIZON - SUN_ELEVATION_REF_Y)
  const direct = smoothstep(-0.06, 0.12, elevation)
  const e = clamp(elevation, 0.03, 1)

  // ── Lighting: long, soft, fading shadows as the sun drops ──────────────
  const shadowLength = 0.28 + 4.2 * (1 - e) ** 2.2
  const shadowOpacity = 0.6 * direct ** 0.9
  const softness = 1.2 + 6 * (1 - e) ** 1.5 + 3 * (1 - direct)

  // ── Sky ────────────────────────────────────────────────────────────────
  const skyTopLab = labAt(0)
  const skyMidLab = labAt(1)
  const skyHorizonLab = labAt(2)
  const top = labToRgb(skyTopLab)
  const mid = labToRgb(skyMidLab)
  const horizon = labToRgb(skyHorizonLab)

  // ── UI hue is read off the sky: the dominant hue of horizon + mid ──────
  const hue = labHue([0, skyHorizonLab[1] * 0.7 + skyMidLab[1] * 0.3, skyHorizonLab[2] * 0.7 + skyMidLab[2] * 0.3])
  const accentHue = hue
  const cardL = scalar('cardL')
  const cardC = scalar('cardC')
  const tone = (L: number, C: number, h = hue) => labToRgb(oklch(L, C, h))
  const panel = tone(cardL, cardC)
  const ink = tone(0.95, 0.012)
  const shade = tone(0.1, 0.02)

  const ui: Record<string, string> = {
    '--ui-sky-top': rgba(top),
    '--ui-sky-horizon': rgba(horizon),
    '--ui-card-bg': rgba(panel, 0.97),
    '--ui-card-bg-top': rgba(tone(cardL + 0.035, cardC * 1.08), 0.97),
    '--ui-card-line': rgba(tone(cardL + 0.16, cardC * 0.9), 0.55),
    '--ui-card-fg': rgba(ink),
    '--ui-card-muted': rgba(tone(0.82, 0.026)),
    '--ui-card-tag': rgba(tone(0.82, 0.09)),
    '--ui-card-dim': rgba(tone(0.08, 0.02), 1),
    '--ui-nav-bg': rgba(tone(cardL - 0.015, cardC), 0.9),
    '--ui-ink': rgba(ink),
    '--ui-ink-muted': rgba(tone(0.88, 0.02)),
    '--ui-ink-shadow': rgba(shade, 0.6),
    '--ui-accent': rgba(tone(0.86, 0.12, accentHue)),
    '--ui-rule': rgba(ink, 0.28),
  }

  return {
    progress,
    sun: {
      x,
      y,
      elevation,
      intensity: clamp(scalar('sunIntensity')),
      color: col('sun'),
      glow: col('glow'),
      glowStrength: clamp(scalar('glowStrength')),
    },
    sky: { top, mid, horizon, haze: mixFast(horizon, mid, 0.3), atmosphere: clamp(scalar('haze')) },
    terrain: {
      far: col('far'),
      mesa: col('mesa'),
      hills: col('hills'),
      sage: col('sage'),
      groundBack: col('groundBack'),
      groundFront: col('groundFront'),
      cactus: col('cactus'),
      rim: col('rim'),
      cloud: col('cloud'),
    },
    lighting: { direct, shadowLength, shadowOpacity, softness, shadowColor: col('shadow') },
    stars: { opacity: clamp(scalar('stars')) },
    shootingStars: { activity: clamp(scalar('shooting')) },
    ui,
  }
}
