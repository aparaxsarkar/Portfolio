import { createRng } from '../../utils/random'

/**
 * A small tile of symmetric light/dark noise. Overlaid at low alpha it breaks
 * up 8-bit gradient banding and gives the flat shapes a printed, painterly tooth.
 */
export function createGrainTile(size = 192) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const rng = createRng(1337)
  for (let i = 0; i < size * size; i++) {
    const v = rng() > 0.5 ? 255 : 0
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = rng() * rng() * 34
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/**
 * Grain for the land. Same seeded noise as `createGrainTile`, but low-passed (a 1-2-1 kernel, wrapping so the tile still
 * repeats seamlessly) and then re-scaled, so a speck is a soft blob rather than a hard single-pixel square.
 *
 * Why: the canvases are capped at 1.5× pixel density, so on a 3× phone every pixel of hard white noise is stretched to a
 * 2×2 block of device pixels, which reads as "pixelated" sand. The sky keeps the original tile.
 *
 * `strength` is the RMS of the result relative to the original tile (1 = same overall grain energy, less = calmer).
 */
export function createSoftGrainTile(size = 192, strength = 0.55) {
  const rng = createRng(1337)
  // Signed noise with the same draw order as createGrainTile: sign from the first draw, magnitude from the next two.
  const noise = new Float32Array(size * size)
  for (let i = 0; i < noise.length; i++) {
    const sign = rng() > 0.5 ? 1 : -1
    noise[i] = sign * rng() * rng() * 34
  }
  const rms = (a: Float32Array) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length)
  const original = rms(noise)

  const blurAxis = (src: Float32Array, horizontal: boolean) => {
    const out = new Float32Array(src.length)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const a = horizontal ? y * size + ((x + size - 1) % size) : ((y + size - 1) % size) * size + x
        const c = y * size + x
        const b = horizontal ? y * size + ((x + 1) % size) : ((y + 1) % size) * size + x
        out[c] = 0.25 * src[a] + 0.5 * src[c] + 0.25 * src[b]
      }
    return out
  }
  const soft = blurAxis(blurAxis(noise, true), false)
  const gain = (strength * original) / rms(soft)

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < soft.length; i++) {
    const v = soft[i] * gain
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0 ? 255 : 0
    img.data[i * 4 + 3] = Math.min(255, Math.abs(v))
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}
