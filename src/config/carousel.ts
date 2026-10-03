/** Carousel feel. Geometry (card size, gap) comes from CSS tokens; this is behaviour. */
export const CAROUSEL = {
  /** Side cards render at this fraction of the centre card. */
  sideScale: 0.84,
  /** Side cards sit this many px lower than the centre card. */
  sideDrop: 16,
  /** Spring stiffness (rad/s). Critically damped; ~0.35 s to settle. */
  omega: 15,
  /** Pointer travel (px) before a press becomes a drag. */
  dragThreshold: 6,
  /** How far momentum carries a release, in seconds of velocity. */
  flingSeconds: 0.14,
  /** Max cards a single fling can skip. */
  maxFling: 2,
  /** Trackpad horizontal-swipe: accumulated delta needed, and cooldown (ms). */
  wheelThreshold: 48,
  wheelCooldown: 380,
  /** Rubber-band resistance past either end (0–1). */
  edgeResistance: 0.32,
  /** Cards further than this from the centre are hidden. */
  visibleRadius: 1.9,
} as const
