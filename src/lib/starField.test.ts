import { describe, it, expect } from 'vitest'
import { projectStars, projectStarsInto, type Star } from './starField'
import { starAltAz } from './astronomy'
import { BRIGHT_STARS } from './brightStars'

// A deterministic deep-night instant over New York (neutral city).
const LAT = 40.71, LON = -74.01
const NIGHT = new Date('2026-01-15T06:00:00Z') // 01:00 EST — well after astronomical dusk

// Independent expected count: EVERY catalogue star above the horizon at that instant.
const expectedAboveHorizon = BRIGHT_STARS.filter(
  (s) => starAltAz(LAT, LON, NIGHT, s.ra, s.dec).altitude > 0
).length

describe('bright-star catalogue integrity', () => {
  it('is all genuine naked-eye stars (mag <= 4.7)', () => {
    expect(BRIGHT_STARS.length).toBeGreaterThan(1000)
    expect(Math.max(...BRIGHT_STARS.map((s) => s.mag))).toBeLessThanOrEqual(4.7)
  })
})

describe('projectStars — accurate night star count', () => {
  it('renders the FULL catalogue above the horizon — no arbitrary cap', () => {
    const got = projectStars(LAT, LON, NIGHT).length
    expect(got).toBe(expectedAboveHorizon)
    // Regression guard: the old code capped at the brightest 650, which at this instant
    // yielded ~325. The accurate amount is materially higher.
    expect(got).toBeGreaterThan(450)
    expect(got).toBeLessThan(BRIGHT_STARS.length) // ~half the sphere is below the horizon
  })

  it('only keeps stars actually above the horizon', () => {
    for (const s of projectStars(LAT, LON, NIGHT)) expect(s.alt).toBeGreaterThan(0)
  })

  it('maps brightness from real magnitude (Sirius brightest, floor ~0)', () => {
    const stars = projectStars(LAT, LON, NIGHT)
    expect(Math.max(...stars.map((s) => s.bf))).toBeGreaterThan(0.9) // a bright star is up
    expect(Math.min(...stars.map((s) => s.bf))).toBeGreaterThanOrEqual(0)
  })
})

describe('projectStarsInto — Play-path parity', () => {
  it('returns the same count as the allocating projection', () => {
    const buf: Star[] = []
    expect(projectStarsInto(buf, LAT, LON, NIGHT)).toBe(expectedAboveHorizon)
  })
})
