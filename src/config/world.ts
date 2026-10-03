/**
 * Every tunable that shapes the environment lives here. Nothing in the
 * renderers hard-codes a path, a section position or a density.
 */

/** Horizon line as a fraction of viewport height. */
export const HORIZON = 0.64

/** The landscape is authored on a 900-unit-tall canvas and scaled to the viewport height. */
export const DESIGN_HEIGHT = 900

/**
 * The sun RISES. Positions are viewport fractions.
 *
 * It waits below the horizon (`yHidden`) until `riseStart`, climbs on a smooth ease to `yRisen` by `riseEnd`, then
 * stays there: once the sun is clearly up the world stops changing, so the journey ends at dawn — never a daytime
 * arc. `x` drifts from `x0` to `x1` over the same interval.
 *
 * `yRisen` / `x1` are chosen so the finished sun sits in the open sky between the Contact heading and the link row,
 * clear of the text and of the large rock masses.
 */
export const SUN_PATH = { x0: 0.8, x1: 0.715, yHidden: 0.84, yRisen: 0.595, riseStart: 0.5, riseEnd: 0.92 }

/** A sun at this viewport height counts as "fully elevated" (elevation = 1). Only used to normalise elevation. */
export const SUN_ELEVATION_REF_Y = 0.3

/**
 * Where each section's anchor sits on the 0→1 journey. Pages scroll natively;
 * the scroll driver maps scroll offset → progress through these control points
 * with a monotone spline, so sections can have any height.
 */
export const SECTION_PROGRESS: Record<string, number> = {
  top: 0,
  experiences: 0.1,
  projects: 0.24,
  research: 0.4,
  education: 0.54,
  achievements: 0.66,
  extracurricular: 0.77,
  skills: 0.88,
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
