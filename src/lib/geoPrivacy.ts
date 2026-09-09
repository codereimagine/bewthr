// PRIVACY-HARDEN-2DP — every coordinate that leaves the device is rounded to
// 2 decimal places (~1.1 km) at the network egress points (open-meteo, MET.no,
// NWS). Precise coordinates stay on-device for local sky / astronomy math only.
// Single source of the rule so the three egress call-sites can never drift.
// See vault Status/Products/bewthr.md · PRIVACY-002.

export const EGRESS_DECIMALS = 2

/** Round a latitude/longitude to the egress precision before it leaves the device. */
export function roundCoord(v: number): number {
  return Math.round(v * 100) / 100
}
