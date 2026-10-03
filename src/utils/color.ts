import { clamp } from './interpolation'

/** sRGB colour, channels 0–255 (floats allowed). */
export type Rgb = [number, number, number]
/** OKLab colour: [L, a, b]. */
export type Lab = [number, number, number]

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToLab([r, g, b]: Rgb): Lab {
  const lr = toLinear(r / 255)
  const lg = toLinear(g / 255)
  const lb = toLinear(b / 255)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function labToRgb([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [
    clamp(toSrgb(clamp(r))) * 255,
    clamp(toSrgb(clamp(g))) * 255,
    clamp(toSrgb(clamp(bl))) * 255,
  ]
}

export const oklch = (L: number, C: number, hDeg: number): Lab => {
  const h = (hDeg * Math.PI) / 180
  return [L, C * Math.cos(h), C * Math.sin(h)]
}

export const labHue = ([, a, b]: Lab) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360

/** Perceptual mix (OKLab), avoids the muddy mid-tones of naive sRGB mixing. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const la = rgbToLab(a)
  const lb = rgbToLab(b)
  return labToRgb([la[0] + (lb[0] - la[0]) * t, la[1] + (lb[1] - la[1]) * t, la[2] + (lb[2] - la[2]) * t])
}

/** Cheap gamma-space mix for hot paths where perceptual accuracy is irrelevant. */
export const mixFast = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export const rgba = ([r, g, b]: Rgb, alpha = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+alpha.toFixed(3)})`

/** WCAG relative luminance contrast ratio. */
export function contrast(a: Rgb, b: Rgb) {
  const lum = ([r, g, bl]: Rgb) =>
    0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(bl / 255)
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
