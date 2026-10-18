import { starAltAz } from './astronomy'
import { BRIGHT_STARS } from './brightStars'

// STAR FIELD — projects the real Yale Bright Star Catalogue (brightStars.ts, pre-trimmed
// to magnitude <= 4.7 so every entry is a genuine naked-eye star) to local alt/az for a
// place + instant, keeping what's above the horizon. The ENTIRE catalogue is used — the
// visible count is therefore the astronomically accurate number of catalogue stars up at
// that time, not an arbitrary cap. (Measured ~0.5ms/frame for the full set; cheap.)
export type Star = { alt: number; az: number; ra: number; bf: number; tint: string }

// bf: 0..1 on-screen brightness from real magnitude. mag -1.46 (Sirius) -> ~1.0,
// mag 4.7 (catalogue floor) -> ~0 (at the naked-eye threshold, as in reality).
function brightnessFromMag(mag: number): number {
  return Math.max(0, Math.min(1, (4.7 - mag) / 6.16))
}

/** Allocating projection (idle / scrub): a fresh array of the above-horizon stars. */
export function projectStars(lat: number, lon: number, when: Date): Star[] {
  return BRIGHT_STARS.reduce<Star[]>((acc, s) => {
    const { altitude, azimuth } = starAltAz(lat, lon, when, s.ra, s.dec)
    if (altitude > 0) acc.push({ alt: altitude, az: azimuth, ra: s.ra, bf: brightnessFromMag(s.mag), tint: s.tint })
    return acc
  }, [])
}

/** Same projection into a REUSED buffer (grown lazily, entries mutated in place),
 *  returning the above-horizon count. Used every frame during Play so the field glides
 *  without allocating a new array per frame (GC churn would stutter). Only the first
 *  `count` entries of `buf` are valid. */
export function projectStarsInto(buf: Star[], lat: number, lon: number, when: Date): number {
  let n = 0
  for (let idx = 0; idx < BRIGHT_STARS.length; idx++) {
    const s = BRIGHT_STARS[idx]
    const { altitude, azimuth } = starAltAz(lat, lon, when, s.ra, s.dec)
    if (altitude <= 0) continue
    let o = buf[n]
    if (!o) { o = buf[n] = { alt: 0, az: 0, ra: 0, bf: 0, tint: '' } }
    o.alt = altitude; o.az = azimuth; o.ra = s.ra
    o.bf = brightnessFromMag(s.mag); o.tint = s.tint
    n++
  }
  return n
}
