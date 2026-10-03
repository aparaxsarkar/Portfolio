/**
 * Art-directed colour stops. The world is one continuous time axis; these
 * frames are sampled with a monotone spline in OKLab (see state.ts), never
 * switched. Order of stops: day · late day · golden hour · sunset · twilight ·
 * deep twilight · night.
 */
/**
 * Art-directed colour stops for the journey NIGHT → DAWN. The world is one continuous time axis; these frames are
 * sampled with a monotone spline in OKLab (see state.ts), never switched.
 *
 *   0.00 pitch black   0.20 deep night   0.40 night        (black · deep blue · dark emerald · brown)
 *   0.55 pre-dawn      0.67 blue/purple hour                (indigo → violet)
 *   0.77 pink + warm horizon   0.85 sunrise yellow          (dusty pink → yellow)
 *   0.93 dawn · 1.00 dawn (identical: the world holds)      (restrained blue, pale yellow horizon)
 *
 * The last two stops are equal on purpose: once the sun is clearly up, nothing keeps changing.
 */
export const STOPS = [0, 0.2, 0.4, 0.55, 0.67, 0.77, 0.85, 0.93, 1] as const

export interface Keyframe {
  skyTop: string
  skyMid: string
  skyHorizon: string
  sun: string
  glow: string
  far: string
  mesa: string
  hills: string
  /** Muted vegetation tone that patches the desert floor. */
  sage: string
  groundBack: string
  groundFront: string
  cactus: string
  rim: string
  shadow: string
  cloud: string
  /** Sun disc + bloom strength. */
  sunIntensity: number
  /** Afterglow strength (survives the sun dipping below the horizon). */
  glowStrength: number
  /** Aerial perspective: how strongly distant layers dissolve into the horizon colour. */
  haze: number
  stars: number
  shooting: number
  /** OKLCH lightness / chroma of UI panels (hue is read off the sky). */
  cardL: number
  cardC: number
}

export const FRAMES: Keyframe[] = [
  // 0.00 — pitch black: black · deep blue · a breath of emerald
  {
    skyTop: '#010207',
    skyMid: '#02060d',
    skyHorizon: '#05150f',
    sun: '#7a2a2a',
    glow: '#0d2018',
    far: '#07131a',
    mesa: '#0e0d10',
    hills: '#071311',
    sage: '#0c231b',
    groundBack: '#0b1c15',
    groundFront: '#030907',
    cactus: '#010203',
    rim: '#3a6a58',
    shadow: '#010305',
    cloud: '#06121c',
    sunIntensity: 0,
    glowStrength: 0,
    haze: 0.25,
    stars: 1,
    shooting: 0.8,
    cardL: 0.15,
    cardC: 0.03,
  },
  // 0.20 — deep night
  {
    skyTop: '#02050d',
    skyMid: '#051019',
    skyHorizon: '#0a2a23',
    sun: '#7a2a2a',
    glow: '#0f2a20',
    far: '#0b1b24',
    mesa: '#141317',
    hills: '#0a1b19',
    sage: '#12322a',
    groundBack: '#102b22',
    groundFront: '#050e0b',
    cactus: '#020507',
    rim: '#44776a',
    shadow: '#02060a',
    cloud: '#08162a',
    sunIntensity: 0,
    glowStrength: 0,
    haze: 0.28,
    stars: 1,
    shooting: 0.8,
    cardL: 0.16,
    cardC: 0.032,
  },
  // 0.40 — night: blue-black · dark emerald · brown undertones
  {
    skyTop: '#040a1c',
    skyMid: '#0a1830',
    skyHorizon: '#143c38',
    sun: '#7a2a2a',
    glow: '#1c4a3c',
    far: '#11232e',
    mesa: '#1b1719',
    hills: '#0e211f',
    sage: '#183b33',
    groundBack: '#17332a',
    groundFront: '#07130f',
    cactus: '#03070a',
    rim: '#4e8672',
    shadow: '#03080c',
    cloud: '#0f2040',
    sunIntensity: 0,
    glowStrength: 0.03,
    haze: 0.3,
    stars: 1,
    shooting: 0.6,
    cardL: 0.17,
    cardC: 0.036,
  },
  // 0.55 — pre-dawn: indigo, the first violet at the horizon
  {
    skyTop: '#070d2e',
    skyMid: '#161c4c',
    skyHorizon: '#33386e',
    sun: '#a04050',
    glow: '#5a3a86',
    far: '#1b2244',
    mesa: '#211b2c',
    hills: '#171f31',
    sage: '#233f44',
    groundBack: '#212c3c',
    groundFront: '#0b111a',
    cactus: '#05070f',
    rim: '#6c78ac',
    shadow: '#05060f',
    cloud: '#1c2552',
    sunIntensity: 0,
    glowStrength: 0.12,
    haze: 0.42,
    stars: 0.85,
    shooting: 0.3,
    cardL: 0.19,
    cardC: 0.04,
  },
  // 0.67 — blue / purple hour
  {
    skyTop: '#12184f',
    skyMid: '#3a2f7a',
    skyHorizon: '#8a5a9a',
    sun: '#c05a6a',
    glow: '#c06a9e',
    far: '#2f2e66',
    mesa: '#3a2942',
    hills: '#302d50',
    sage: '#3b5260',
    groundBack: '#4a3f66',
    groundFront: '#1e1a32',
    cactus: '#0a0c1c',
    rim: '#c08ad2',
    shadow: '#0d0a24',
    cloud: '#5b4b98',
    sunIntensity: 0.05,
    glowStrength: 0.4,
    haze: 0.55,
    stars: 0.5,
    shooting: 0.1,
    cardL: 0.22,
    cardC: 0.046,
  },
  // 0.77 — pink + warm horizon
  {
    skyTop: '#26307a',
    skyMid: '#8a4f8e',
    skyHorizon: '#f2907e',
    sun: '#ffb36a',
    glow: '#ff9a8a',
    far: '#6a4f8e',
    mesa: '#6a3340',
    hills: '#7a4458',
    sage: '#6b5a62',
    groundBack: '#a8586a',
    groundFront: '#4a2a40',
    cactus: '#1a1228',
    rim: '#ff9a86',
    shadow: '#2a1236',
    cloud: '#e88aa0',
    sunIntensity: 0.55,
    glowStrength: 0.85,
    haze: 0.62,
    stars: 0.12,
    shooting: 0,
    cardL: 0.27,
    cardC: 0.052,
  },
  // 0.85 — sunrise: yellow breaks through, blue arrives overhead
  {
    skyTop: '#2f4f92',
    skyMid: '#a65f86',
    skyHorizon: '#ffcf80',
    sun: '#ffe9a8',
    glow: '#ffc27a',
    far: '#76688f',
    mesa: '#6a362f',
    hills: '#a06c50',
    sage: '#7e6e54',
    groundBack: '#c0814e',
    groundFront: '#663f30',
    cactus: '#2a2430',
    rim: '#ffd890',
    shadow: '#3a2236',
    cloud: '#ffb89a',
    sunIntensity: 1,
    glowStrength: 1,
    haze: 0.6,
    stars: 0,
    shooting: 0,
    cardL: 0.31,
    cardC: 0.05,
  },
  // 0.93 — dawn: restrained blue, pale yellow horizon (the world holds from here)
  {
    skyTop: '#2f5896',
    skyMid: '#395b93',
    skyHorizon: '#fcd49a',
    sun: '#fff3c8',
    glow: '#ffd596',
    far: '#7480a6',
    mesa: '#4d2822',
    hills: '#a07650',
    sage: '#746b54',
    groundBack: '#b98757',
    groundFront: '#6e4a32',
    cactus: '#2b4237',
    rim: '#ffe6b0',
    shadow: '#35231f',
    cloud: '#fff0d8',
    sunIntensity: 1,
    glowStrength: 0.9,
    haze: 0.5,
    stars: 0,
    shooting: 0,
    cardL: 0.33,
    cardC: 0.045,
  },
  // 1.00 — dawn (identical to 0.93)
  {
    skyTop: '#2f5896',
    skyMid: '#395b93',
    skyHorizon: '#fcd49a',
    sun: '#fff3c8',
    glow: '#ffd596',
    far: '#7480a6',
    mesa: '#4d2822',
    hills: '#a07650',
    sage: '#746b54',
    groundBack: '#b98757',
    groundFront: '#6e4a32',
    cactus: '#2b4237',
    rim: '#ffe6b0',
    shadow: '#35231f',
    cloud: '#fff0d8',
    sunIntensity: 1,
    glowStrength: 0.9,
    haze: 0.5,
    stars: 0,
    shooting: 0,
    cardL: 0.33,
    cardC: 0.045,
  },
]
