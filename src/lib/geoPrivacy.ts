// PRIVACY-HARDEN — every coordinate that leaves the device is rounded to the
// user's chosen precision at the network egress points (open-meteo, MET.no,
// NWS). Precise coordinates stay on-device for local sky / astronomy math only.
// Single source of the rule so the egress call-sites can never drift.
// See vault Status/Products/bewthr.md · PRIVACY-002.

export type LocationPrecision = 'exact' | 'surrounding' | 'general'

/** Decimal places allowed to leave the device per level.
 *  null = exact (no rounding). 2dp ≈ 1.1 km, 1dp ≈ 11 km. */
export const PRECISION_DECIMALS: Record<LocationPrecision, number | null> = {
  exact: null,
  surrounding: 2,
  general: 1,
}

/** Back-compat: the default egress precision is `surrounding` (2 decimals). */
export const EGRESS_DECIMALS = 2

/**
 * Round a latitude/longitude to the egress precision before it leaves the
 * device. Defaults to `surrounding` (2dp) so untouched call-sites keep the
 * prior privacy behaviour.
 */
export function roundCoord(v: number, precision: LocationPrecision = 'surrounding'): number {
  const dp = PRECISION_DECIMALS[precision]
  if (dp === null) return v
  const f = 10 ** dp
  return Math.round(v * f) / f
}
