// Continuum sky depth: projection (with an optional horizon line), the horizon's anchor,
// the layered-depth parallax and the time-based tilt easing. Pure — no DOM, no React.

// The view shows the FULL sky: all 360° around (FOV) from the horizon (bottom) to overhead
// (top). Its centre faces the equator — south in the northern hemisphere, north in the
// southern — where the sun and moon cross the sky; due north/south sits at both side edges.
export const FACE = 180
export const FOV = 360

// az/alt (deg) -> canvas px. Without horizonY the horizon is the bottom edge (alt 0 at H);
// with it, alt 0 sits at horizonY and 90 stays at the top, leaving ground below.
export function project(
  az: number, alt: number, W: number, H: number, face = FACE, horizonY?: number,
): { x: number; y: number; vis: boolean } {
  const d = ((az - face + 540) % 360) - 180
  const base = horizonY ?? H
  return { x: W / 2 + (d / (FOV / 2)) * (W / 2), y: base - (alt / 90) * base, vis: Math.abs(d) < FOV / 2 }
}

// Continuum: the horizon sits this many CSS px above the 24h scrubber's top edge, so a
// low sun/moon/star is drawn in clear sky, not behind the bottom panel. Tuned on glass.
export const HORIZON_LIFT = 56

// Device-px horizon line: scrubber top lifted, clamped to [45% of the viewport, viewport].
export function horizonFor(scrubberTopCss: number, viewportHCss: number, dpr: number): number {
  const y = Math.min(viewportHCss, Math.max(viewportHCss * 0.45, scrubberTopCss - HORIZON_LIFT))
  return y * dpr
}

// The panel top (CSS px) the horizon lifts above: the scrubber's real top, but never lower than
// where it rests at the bottom of the view (viewBottom − bottom padding − its height). Content
// above it (an expanded alert, the update banner) can push it down or below the fold; the sky's
// bottom scrim stays pinned to the view, so following it there would sink the moon under the scrim.
export function horizonAnchor(scrubTopCss: number, scrubHCss: number, viewBottomCss: number, padBottomCss: number): number {
  return Math.min(scrubTopCss, viewBottomCss - padBottomCss - scrubHCss)
}

// Continuum depth, far → near. One number per layer drives the tilt/auto-drift offset:
// farther layers move less, nearer layers more (iOS Spatial Scenes). Order must hold.
export const DEPTH = { stars: 0.25, body: 0.55, clouds: 1, precip: 1.15 } as const

// CSS px a depth-1 layer moves at full tilt (|ax| = 1). 20 keeps the moon within a few % of the
// width of its true spot even at full tilt + drift (|ax| ≈ 1.9 → ~21 px on a 390 px phone).
export const PARALLAX_PX = 20

// Device-px offset for a layer at `depth`, given the tilt/drift ax, ay. Vertical is damped.
export function parallax(depth: number, ax: number, ay: number, dpr: number): { dx: number; dy: number } {
  return { dx: ax * depth * PARALLAX_PX * dpr, dy: ay * depth * PARALLAX_PX * dpr * 0.6 }
}

// Same as parallax, written into `o` (the per-frame path reuses one object).
export function parallaxInto(o: { dx: number; dy: number }, depth: number, ax: number, ay: number, dpr: number): { dx: number; dy: number } {
  o.dx = ax * depth * PARALLAX_PX * dpr; o.dy = ay * depth * PARALLAX_PX * dpr * 0.6
  return o
}

// x + dx, kept in [r, W − r] so a disc of radius r never slides off a side edge.
export function clampOffset(x: number, dx: number, r: number, W: number): number {
  return Math.max(r, Math.min(W - r, x + dx))
}

// Tilt easing is by elapsed ms (like fadeK), so it feels the same at 60 and 120 fps and
// whatever the sensor's event rate. TILT_TAU_MS follows the held tilt; NEUTRAL_TAU_MS is the
// slow re-centre onto how the phone is actually held.
export const TILT_TAU_MS = 160
export const NEUTRAL_TAU_MS = 4000

export function easeTilt(cur: number, target: number, dtMs: number, tauMs: number): number {
  return cur + (target - cur) * (1 - Math.exp(-dtMs / tauMs))
}
