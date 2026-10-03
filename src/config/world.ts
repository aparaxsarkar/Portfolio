/**
 * Every tunable that shapes the environment lives here. Nothing in the
 * renderers hard-codes a path, a section position or a density.
 */

/** Horizon line as a fraction of viewport height. */
export const HORIZON = 0.64

/** The landscape is authored on a 900-unit-tall canvas and scaled to the viewport height. */
export const DESIGN_HEIGHT = 900

/**
 * The journey is one continuous timeline. World progress `s` (0 → 1, from scroll) indexes the night → dawn keyframes
 * through `TIMELINE`: s = 0 is exactly the state the Projects section used to have (deep night, full star field, sun
 * well below the horizon) and s = 1 is the finished dawn. The span in between is stretched over the whole page, and
 * every channel is still changing at s = 1 — there is no held end state.
 */
export const TIMELINE = { start: 0.24, end: 0.93 }

/**
 * The sun RISES, continuously, across the whole journey (it is already moving at s = 0, though still hidden, and still
 * moving at s = 1). Positions are viewport fractions.
 *
 * `x1`/`yEnd` are the resting dawn position. `yEnd` is chosen so the whole disc sits immediately on the local skyline
 * of the saddle between the rock masses — the terrain is shaped to keep that skyline at a known height at `x1` for every
 * viewport width (see `SUN_SADDLE`), and `qa/sunrise.mjs` measures the result from rendered pixels.
 */
export const SUN_PATH = { x0: 0.8, x1: 0.715, yStart: 0.84, yEnd: 0.608 }

/** Terrain around the sunrise is lowered into a flat notch so the finished sun can sit directly on the skyline. */
export const SUN_SADDLE = { halfWidth: 100, depth: 0.99 }

/** A sun at this viewport height counts as "fully elevated" (elevation = 1). Only used to normalise elevation. */
export const SUN_ELEVATION_REF_Y = 0.3

/**
 * Where each section's anchor sits on the 0→1 journey (evenly spread: the whole page is the journey). Pages scroll natively;
 * the scroll driver maps scroll offset → progress through these control points
 * with a monotone spline, so sections can have any height.
 */
export const SECTION_PROGRESS: Record<string, number> = {
  top: 0,
  experiences: 1 / 8,
  projects: 2 / 8,
  research: 3 / 8,
  education: 4 / 8,
  achievements: 5 / 8,
  extracurricular: 6 / 8,
  skills: 7 / 8,
  contact: 1,
}

export const STARS = {
  /** Stars per 10,000 px² of sky. */
  density: 4.2,
  max: 520,
  seed: 7919,
  /** Milky-way band strength (0 disables). */
  band: 0.5,
}

export const SHOOTING_STARS = {
  /** Mean seconds between events at activity = 0 → 1. */
  meanGapQuiet: 110,
  meanGapBusy: 30,
  minGap: 6,
  lifeMin: 0.55,
  lifeMax: 1.0,
  peakAlpha: 0.75,
}

/** Device-pixel-ratio ceiling for the painted layers. */
export const DPR_CAP = 1.5
