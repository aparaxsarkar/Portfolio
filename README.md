# Aparajita Sarkar — Portfolio

A single, persistent illustrated desert. **The world doesn't move — time does.** Vertical scroll is the passage of
time: the portfolio opens in pitch-black night under a field of stars, the sky warms through blue and violet to a
dusty pink horizon, the sun rises, the stars fade out, and the journey ends exactly as the sun clears the horizon. It never continues
into daytime, and nothing is held or stationary at the end: the world is still moving at the last pixel of the page. Shadows lengthen out of nothing as the sun clears the rocks. Content (experiences, projects, research,
…) is ordinary accessible HTML laid over the scene.

Live at **https://aparaxsarkar.github.io/Portfolio/** (see [Deployment](#deployment)).

## Stack

- React 19 + TypeScript, built with Vite
- Plain CSS (design tokens as custom properties) — no UI framework, no animation library
- Canvas 2D for the environment (no Three.js: this is a 2.5D problem)
- Self-hosted fonts via Fontsource (Instrument Serif, Geist, Geist Mono)
- Runtime dependencies: `react`, `react-dom`. That's it.

## How it works

```
native scroll ──► scroll driver ──► progress (0…1) ──► computeWorld() ──► WorldState
                  (monotone spline    one number         pure function        │
                   through section                                            ├─► sky canvas   (gradient, sun, clouds)
                   anchors)                                                   ├─► stars canvas (stars, shooting stars)
                                                                              ├─► land canvas  (terrain, shadows, light)
                                                                              └─► CSS variables (card hue, text, accent)
```

### Scroll → time

`src/scroll/driver.ts` is the only place scroll becomes world progress. Scrolling stays **native**; the driver
measures each section's scroll offset and maps `scrollY → progress` with a monotone cubic spline through the control
points in `SECTION_PROGRESS` (`src/config/world.ts`). Sections can therefore have any height while time still
passes at the pace you chose, and the mapping is smooth (no change in the speed of time at a section boundary).
Progress is written to a small external store (`src/world/store.ts`), never to React state, so scrolling does not
re-render the component tree. Scrolling backwards retraces the same states exactly — there are no enter/exit
animations and nothing time-based in the environment (a Playwright check compares pixels forward vs. backward).

### One canonical world state

`computeWorld(progress)` in `src/world/state.ts` returns *everything* environmental: sun position/intensity, sky
colours, terrain colours, lighting (direct-light strength, shadow length/opacity/softness), star and shooting-star
levels, and the UI colour tokens. Colours are authored as keyframes (`src/world/keyframes.ts`) and sampled with a
monotone spline **in OKLab**, so mixes stay clean (no muddy mid-tones, no overshoot). Nothing drifts out of sync
because nothing has its own clock.

- **One timeline across the whole page.** World progress `s` (0 → 1) indexes the night → dawn keyframes through
  `TIMELINE` (`config/world.ts`): `s = 0` is the state the Projects section used to have (deep night, full stars,
  sun below the horizon — `qa/fixtures/projects-state.json` pins it field for field) and `s = 1` is the finished
  dawn. The approved palette is simply stretched over the page; there is no end stop, so nothing stalls.
- **The sun rises continuously** (`SUN_PATH`): already moving at `s = 0` (though hidden), still moving at `s = 1`,
  on an ease whose slope never reaches zero. Its resting position is calibrated against the *actual skyline*: the
  terrain is shaped into a flat notch at the sun's x for every viewport width (`SUN_SADDLE`), so the finished disc
  sits on the horizon — fully visible, no sky gap. `qa/sunrise.mjs` measures this from rendered pixels at all five
  target sizes. The rock masses are pushed apart on portrait screens to keep the saddle open.
- **Palette journey** (`world/keyframes.ts`): pitch black / emerald → deep blue → indigo → violet → dusty pink →
  yellow → a restrained blue dawn.
- **Lighting is continuous, never branched.** Nothing in the renderer asks "is the sun left or right of this
  object?". Each object gets a light direction `lx = tanh((sunX − x) / range)` (smooth, passes through 0 as the sun
  goes by) and a frontal term from sun elevation; the illumination across its surface is sampled from those into
  gradient stops. As the sun moves the bright band *slides across the object*; there is no frame where one
  gradient is swapped for another. Rim light is `(sun-facing side) × (closeness to the edge)` — both continuous.
  `qa/lighting.mjs` enforces this (see below).
- **Shadows** — they radiate from the point on the horizon directly beneath the sun (the correct picture when you
  look toward the sun). Objects right of that point throw shadows right; the direction passes smoothly through
  "straight toward the viewer" as the sun crosses. Length follows sun elevation (and shrinks with distance), opacity
  follows direct light, softness grows as light gets low.
- **The desert floor is a lit heightfield**, not stacked paths: a seeded 2-D height function is sampled once on a
  coarse grid in ground-plane coordinates (`world/render/ground.ts`); each frame every cell is lit by the same
  sun and the result is upscaled with bilinear filtering. That is what gives the broad, soft, painted tonal masses
  and irregular shadows that slide across the dunes — with no contour outlines.
- **Formations** are procedural, asymmetrical and terraced (cliff faces, benches, erosion bites, tonal strata),
  and distance is expressed through colour, contrast and haze — near rock is darker and crisper, far rock is pale
  and desaturated — not through blur.
- **Stars** — seeded, never reshuffled. Each star has a threshold, so as `stars.opacity` falls toward dawn the faintest
  go first and the brightest linger — they fade, they don't switch off. A faint Milky-Way band adds depth.
- **Shooting stars** — rare, unscheduled events (exponential gaps whose mean shrinks with `shootingStars.activity`);
  present in the dark, gone by sunrise, and off entirely under `prefers-reduced-motion`.
- **Card hue** — derived from the dominant hue of the sky's horizon + mid colour at the current progress; only
  lightness/chroma are authored. Panels are near-opaque (never glass).

### Rendering

`src/world/renderer.ts` mounts three stacked canvases — sky (opaque) · stars · land — so stars sit behind the
mountains. Sky and land repaint only when progress changes (one `requestAnimationFrame`, coalesced). The star layer
has its own throttled (≈30 fps) loop that runs **only** while stars are visible and the tab is visible. Geometry is
built once per viewport width in a 900-unit design space (`src/world/render/scene.ts`) and reused for every frame;
narrow screens see the same world with large features scaled down. Device-pixel ratio is capped at 1.5.

### Carousel

`src/hooks/useCarousel.ts`. A float focus position `pos` is chased by a critically-damped spring toward an integer
target. Each card is placed as a pure function of its signed distance from the centre (offset, scale, drop, dimming
all interpolate continuously — no class swapping) and styles are written straight to the DOM, so dragging and
animating never re-render React. Supports buttons, ticks, `←/→/Home/End`, pointer drag with momentum and rubber-band
edges, touch swipe (`touch-action: pan-y` keeps vertical scrolling native), and horizontal trackpad swipes.
Focusing a link in a side card brings it to the centre. When items fit side by side at full size (Education's two
cards) the carousel steps aside and the cards keep the standard dimensions.

### Content is data

All copy lives in `src/data/*.ts` and is rendered through typed shapes (`src/data/types.ts`). Placeholder entries are
clearly marked `[LIKE THIS]`. To update the site, edit those files — no component changes. Every card carries
`tags`, `title`, a short `description` (up to five lines, then clamped) and an **optional** `link` `{ label, href }`. Projects and research
link to GitHub (`github('repo-slug')`); other cards link to what they describe (`external('Certificate', …)`,
`'Details'`, `'View'`), so the visible label and the accessible name always match the destination. An entry with no
real destination simply omits `link` and the card renders without one.

Education is the exception: it is a credential, not a project, so it uses its own `EducationEntry` shape (`degree`,
`years`, `university`, optional `gpa`, `distinction`, `link`) and a concise card with no summary. Optional fields that are
absent are simply not rendered.

## Project layout

```
src/
  config/        tunables: sun path, section→progress stops, star density, carousel feel
  data/          content (placeholders) + schemas
  scroll/        scroll driver (scrollY → progress), active section
  world/         state.ts (the model), keyframes.ts, store.ts, renderer.ts, render/{sky,land,stars,scene}.ts
  hooks/         useCarousel, motion (reduced-motion helper)
  components/    Navigation, Hero, Section, Carousel, Card, Skills, Contact
  styles/        tokens.css (design tokens), base.css
  utils/         color (OKLab), interpolation (monotone splines), seeded random
qa/              Playwright scripts used for visual + functional QA (not part of the build)
```

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve dist/ on :4173
npm run lint
```

### QA scripts

The `qa/` scripts drive system Chrome through `playwright-core` (no browser download):

```bash
npm run preview &                       # for capture/audit
npm run dev &                           # for interaction (imports TS modules)
node qa/capture.mjs 1440x900,390x844    # screenshots of every section → qa/shots/
node qa/interaction.mjs                 # nav, carousel (keys/drag/touch/wheel/focus), sun path, determinism, shooting-star cadence
node qa/lighting.mjs                    # lighting continuity: (A) sweeps progress, (B) sweeps the sun across every formation; fails on any abrupt tonal change
node qa/journey.mjs <dir> [WxH] [p,…]   # world-only filmstrip of the night → dawn journey at explicit progress values
node qa/percent.mjs <dir> [WxH] [0,25,…] # the real page (UI included) at given % of the scroll range
node qa/sun-composite.mjs --engine=chromium|webkit --max-disc=0.6 --max-glow=0.9 --only-served   # noise in the sun disc/glow on the FINAL composited pixels, Chrome or WebKit (Safari's engine), layer by layer
node qa/sun-grain.mjs                   # pixel noise inside the sun disc at 1×/2×/3× densities (fails above a threshold with --max=0.5)
node qa/sunrise.mjs                     # terminal sun: fully visible and resting on the skyline, measured from pixels, 5 viewports
node qa/mesa-strip.mjs <dir> [mesa]     # renders a filmstrip around a formation + checks forward→back is pixel-identical
node qa/audit.mjs                       # axe-core, text contrast over the painted sky, scroll frame times, reduced motion
```

Edit the Chrome path at the top of each script if you are not on macOS.

## Deployment

Target: **https://aparaxsarkar.github.io/Portfolio/** — a GitHub Pages *project site* (any repository can have one, at
`<user>.github.io/<repo>/`). Pages from a *private* repository needs a paid plan, so the repository must be **public**.

1. Make `aparaxsarkar/Portfolio` public (*Settings → General → Danger Zone → Change visibility*).
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Push to `main` (or run the workflow by hand). The workflow lints, builds and publishes `dist/`.

The workflow deploys on every push to `main`, and can also be run by hand (*Actions → Deploy to GitHub Pages → Run workflow*).

The Vite `base` is `./`, so assets resolve under the `/Portfolio/` sub-path (and at a domain root). There is no client-side
router (sections are in-page anchors), so there are no deep links for Pages to 404.

## Accessibility & motion

Semantic landmarks and heading order, a skip link, visible focus rings, a labelled carousel pattern
(`aria-roledescription`, live status, individually labelled slides), `aria-current` in navigation, and no
essential text inside canvases (the environment is `aria-hidden`). `prefers-reduced-motion` removes shooting stars
and star twinkle, makes the carousel snap, and makes navigation jump instead of smooth-scrolling, while the
time-of-day system itself still works.
