/** Small seeded PRNG (mulberry32): the whole landscape is a pure function of its seeds. */
export function createRng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Object.assign(next, {
    range: (lo: number, hi: number) => lo + (hi - lo) * next(),
    int: (lo: number, hi: number) => Math.floor(lo + (hi - lo + 1) * next()),
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  })
}

/** 1-D value noise, smooth, deterministic, in [0, 1]. */
export function createNoise1D(seed: number) {
  const rng = createRng(seed)
  const table = Array.from({ length: 512 }, () => rng())
  const at = (i: number) => table[((i % 512) + 512) % 512]
  return (x: number) => {
    const i = Math.floor(x)
    const f = x - i
    const u = f * f * (3 - 2 * f)
    return at(i) * (1 - u) + at(i + 1) * u
  }
}

export function createFbm1D(seed: number, octaves = 4) {
  const noise = createNoise1D(seed)
  return (x: number) => {
    let amp = 0.5
    let freq = 1
    let sum = 0
    let norm = 0
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * freq + o * 17.3) * amp
      norm += amp
      amp *= 0.5
      freq *= 2.03
    }
    return sum / norm
  }
}

/** 2-D value noise in [0, 1], smooth and deterministic. Used for the terrain heightfield. */
export function createNoise2D(seed: number) {
  const rng = createRng(seed)
  const N = 256
  const grid = Float32Array.from({ length: N * N }, () => rng())
  const at = (x: number, y: number) => grid[(y & 255) * N + (x & 255)]
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = x - xi
    const fy = y - yi
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)
    const a = at(xi, yi) * (1 - u) + at(xi + 1, yi) * u
    const b = at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u
    return a * (1 - v) + b * v
  }
}
