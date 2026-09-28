// Star-glyph library for the Sky Tonight rows (Imagined mode).
// Constellations render as stylised line-art; planets as colour-true glowing discs.
// Coordinates live in a 0–30 viewBox, y-down (smaller y = higher in the frame).

// Accurate moon-phase shadow: the dark region of a disc (centred at 0,0, radius R)
// for a given illuminated fraction. `waxing` = light growing (lit on the right,
// N. hemisphere). Built from two arcs — the dark limb + the terminator ellipse —
// so it's exact at any illumination, not a coarse per-name bucket.
export function moonShadowPath(R: number, illum: number, waxing: boolean): string {
  const b = R * (1 - 2 * illum) // signed terminator x-radius
  const sideSweep = waxing ? 0 : 1
  const termSweep = b > 0 ? sideSweep : 1 - sideSweep
  return `M0,${-R} A${R},${R} 0 0,${sideSweep} 0,${R} A${Math.abs(b).toFixed(2)},${R} 0 0,${termSweep} 0,${-R} Z`
}

export interface StarShape {
  stars: [number, number][]
  /** index of the brightest star — drawn gold */
  lead: number
  /** star-index pairs to connect with lines */
  lines: [number, number][]
}

// Stylised but recognisable asterisms.
export const CONSTELLATION_SHAPES: Record<string, StarShape> = {
  Orion: {
    stars: [[8, 6], [21, 6], [11, 15], [15, 16], [19, 15], [7, 26], [24, 25]],
    lead: 1,
    lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
  },
  'Ursa Major': {
    stars: [[5, 13], [11, 14], [12, 8], [6, 7], [11, 14], [16, 18], [21, 19], [26, 16]],
    lead: 7,
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 5], [5, 6], [6, 7]],
  },
  'Ursa Minor': {
    stars: [[7, 9], [12, 10], [12, 15], [8, 15], [16, 8], [20, 6], [24, 4]],
    lead: 6,
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [1, 4], [4, 5], [5, 6]],
  },
  Cassiopeia: {
    stars: [[4, 8], [10, 16], [15, 8], [20, 16], [26, 8]],
    lead: 2,
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  Cygnus: {
    stars: [[15, 4], [15, 13], [15, 26], [5, 13], [25, 13]],
    lead: 2,
    lines: [[0, 1], [1, 2], [3, 1], [1, 4]],
  },
  Leo: {
    stars: [[7, 9], [10, 14], [14, 12], [13, 18], [21, 17], [26, 21], [15, 22]],
    lead: 5,
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 3]],
  },
  Scorpius: {
    stars: [[5, 6], [8, 11], [12, 15], [16, 18], [20, 20], [24, 18], [25, 13]],
    lead: 2,
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  Sagittarius: {
    stars: [[6, 15], [11, 10], [16, 12], [15, 19], [9, 20], [21, 9], [21, 16]],
    lead: 2,
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5], [3, 6]],
  },
  Taurus: {
    stars: [[4, 7], [11, 14], [20, 11], [26, 6], [24, 18]],
    lead: 1,
    lines: [[0, 1], [1, 2], [2, 3], [2, 4]],
  },
  Gemini: {
    stars: [[8, 5], [9, 12], [10, 19], [11, 25], [17, 6], [18, 13], [19, 20], [20, 26]],
    lead: 0,
    lines: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [0, 4]],
  },
}

export interface PlanetStyle {
  core: string
  glow: string
  ring?: string
  band?: string
}

// True-to-life planet colours (function-as-ornament: the colour IS the planet).
export const PLANET_STYLES: Record<string, PlanetStyle> = {
  Mercury: { core: '#c8c0b0', glow: 'rgba(200,192,176,0.5)' },
  Venus: { core: '#f7ecca', glow: 'rgba(247,236,202,0.6)' },
  Mars: { core: '#e0563a', glow: 'rgba(224,86,58,0.55)' },
  Jupiter: { core: '#e6c79a', glow: 'rgba(230,199,154,0.55)', band: '#c39f72' },
  Saturn: { core: '#ecdfa8', glow: 'rgba(236,223,168,0.5)', ring: '#d8c98f' },
}
