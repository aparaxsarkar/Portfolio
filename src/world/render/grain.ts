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
