// Continuum sky depth: projection (with an optional horizon line) and, in later
// helpers, the layered-depth maths. Pure — no DOM, no React.

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
