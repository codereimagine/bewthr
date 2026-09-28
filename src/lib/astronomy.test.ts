import { describe, it, expect } from 'vitest'
import {
  getSun,
  getMoon,
  getPlanets,
  azimuthToCompass,
  altitudeState,
} from './astronomy'

// Fort Collins, CO (MDT = UTC-6 in June)
const LAT = 40.585
const LON = -105.084
const MOON_PHASES = [
  'New', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
]

describe('xengine (astronomy) — celestial accuracy', () => {
  it('sun is high at local midday, below the horizon at local midnight', () => {
    const midday = new Date('2026-06-21T19:00:00Z') // ~13:00 MDT, summer solstice
    const s = getSun(LAT, LON, midday)
    expect(s.isDay).toBe(true)
    expect(s.altitude).toBeGreaterThan(30)

    const midnight = new Date('2026-06-21T07:00:00Z') // ~01:00 MDT
    const s2 = getSun(LAT, LON, midnight)
    expect(s2.isDay).toBe(false)
    expect(s2.altitude).toBeLessThan(-5)
  })

  it('sun rise/set resolve to real Dates', () => {
    const s = getSun(LAT, LON, new Date('2026-06-21T12:00:00Z'))
    expect(s.rise).toBeInstanceOf(Date)
    expect(s.set).toBeInstanceOf(Date)
    expect(Number.isFinite(s.azimuth)).toBe(true)
  })

  it('moon: valid phase name + illumination in [0,1] + finite alt/az', () => {
    const m = getMoon(LAT, LON, new Date('2026-06-21T07:00:00Z'))
    expect(MOON_PHASES).toContain(m.phaseName)
    expect(m.illumination).toBeGreaterThanOrEqual(0)
    expect(m.illumination).toBeLessThanOrEqual(1)
    expect(Number.isFinite(m.altitude)).toBe(true)
    expect(Number.isFinite(m.azimuth)).toBe(true)
    expect(m.aboveHorizon).toBe(m.altitude > 0)
  })

  it('planets: five classical bodies, all finite alt/az', () => {
    const p = getPlanets(LAT, LON, new Date('2026-06-21T07:00:00Z'))
    expect(p).toHaveLength(5)
    expect(p.map((x) => x.name).sort()).toEqual(
      ['Jupiter', 'Mars', 'Mercury', 'Saturn', 'Venus'],
    )
    for (const pl of p) {
      expect(Number.isFinite(pl.altitude)).toBe(true)
      expect(pl.azimuth).toBeGreaterThanOrEqual(0)
      expect(pl.azimuth).toBeLessThan(360)
    }
  })

  it('azimuth → compass maps the cardinals correctly', () => {
    expect(azimuthToCompass(0)).toBe('N')
    expect(azimuthToCompass(45)).toBe('NE')
    expect(azimuthToCompass(90)).toBe('E')
    expect(azimuthToCompass(180)).toBe('S')
    expect(azimuthToCompass(270)).toBe('W')
    expect(azimuthToCompass(360)).toBe('N')
  })

  it('altitude state reflects rising vs setting near the horizon', () => {
    expect(altitudeState(2, 5)).toBe('rising')
    expect(altitudeState(2, 1)).toBe('setting')
    expect(altitudeState(60, 61)).toBe('high')
  })

  it('is deterministic for a fixed instant + coordinates', () => {
    const t = new Date('2026-01-15T04:00:00Z')
    const a = getSun(LAT, LON, t)
    const b = getSun(LAT, LON, t)
    expect(a.altitude).toBe(b.altitude)
    expect(a.azimuth).toBe(b.azimuth)
  })
})
