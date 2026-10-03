export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (a === b ? 0 : (v - a) / (b - a))
export const remap = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, clamp(invLerp(a, b, v)))
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp(invLerp(a, b, v))
  return t * t * (3 - 2 * t)
}

/**
 * Monotone cubic Hermite spline (Fritsch–Carlson). Passes through every
 * control point, is C1-continuous, and never overshoots between points — which
 * matters for colour channels (no clipped / ringing hues) and for the
 * scroll → progress mapping (no backwards time).
 */
export function createSpline(xs: readonly number[], ys: readonly number[]): (x: number) => number {
  const n = xs.length
  if (n === 1) return () => ys[0]
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])
  const m: number[] = new Array(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      m[i] = tau * a * d[i]
      m[i + 1] = tau * b * d[i]
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const t = (x - xs[i]) / h
    const t2 = t * t
    const t3 = t2 * t
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    )
  }
}

/** One spline per channel, evaluated together into a reusable output array. */
export function createChannelSampler(xs: readonly number[], rows: readonly (readonly number[])[]) {
  const channels = rows[0].length
  const splines = Array.from({ length: channels }, (_, c) =>
    createSpline(
      xs,
      rows.map((r) => r[c]),
    ),
  )
  return (x: number): number[] => splines.map((s) => s(x))
}
