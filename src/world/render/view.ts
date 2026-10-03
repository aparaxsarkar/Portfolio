/** Geometry of the painted viewport shared by every renderer. */
export interface View {
  /** CSS pixels. */
  w: number
  h: number
  dpr: number
  /** Design-space → CSS pixel scale (viewport height / 900). */
  k: number
  /** Viewport width in design units. */
  widthD: number
  /** Horizon, CSS pixels. */
  horizonPx: number
}
