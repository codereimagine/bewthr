import { describe, it, expect } from 'vitest'
import { parseStoredGeo, serializeGeo, geolocationErrorMessage, type GeoFix } from './geo'

describe('parseStoredGeo — secured fix validation', () => {
  it('accepts a valid fix', () => {
    expect(parseStoredGeo({ lat: 40.585, lon: -105.084 })).toEqual({ lat: 40.585, lon: -105.084 })
  })

  it('accepts the range extremes', () => {
    expect(parseStoredGeo({ lat: -90, lon: -180 })).toEqual({ lat: -90, lon: -180 })
    expect(parseStoredGeo({ lat: 90, lon: 180 })).toEqual({ lat: 90, lon: 180 })
  })

  it('rejects out-of-range coordinates', () => {
    expect(parseStoredGeo({ lat: 91, lon: 0 })).toBeNull()
    expect(parseStoredGeo({ lat: 0, lon: 181 })).toBeNull()
    expect(parseStoredGeo({ lat: -91, lon: 0 })).toBeNull()
  })

  it('rejects non-numeric, NaN, and Infinity', () => {
    expect(parseStoredGeo({ lat: '40', lon: -105 })).toBeNull()
    expect(parseStoredGeo({ lat: NaN, lon: 0 })).toBeNull()
    expect(parseStoredGeo({ lat: Infinity, lon: 0 })).toBeNull()
  })

  it('rejects garbage / empty input', () => {
    expect(parseStoredGeo(null)).toBeNull()
    expect(parseStoredGeo(undefined)).toBeNull()
    expect(parseStoredGeo('40,-105')).toBeNull()
    expect(parseStoredGeo({})).toBeNull()
  })
})

describe('serializeGeo — round-trips through parseStoredGeo', () => {
  it('serialize then parse yields the same fix', () => {
    const fix: GeoFix = { lat: 12.34, lon: -56.78 }
    expect(parseStoredGeo(JSON.parse(serializeGeo(fix)))).toEqual(fix)
  })

  it('writes only lat/lon (no extra fields leak in)', () => {
    const out = JSON.parse(serializeGeo({ lat: 1, lon: 2 }))
    expect(Object.keys(out).sort()).toEqual(['lat', 'lon'])
  })
})

describe('geolocationErrorMessage — generic, no location hints', () => {
  it('maps known codes', () => {
    expect(geolocationErrorMessage(1)).toBe('Location permission denied')
    expect(geolocationErrorMessage(2)).toBe('Location unavailable')
    expect(geolocationErrorMessage(3)).toBe('Location request timed out')
  })
  it('falls back for unknown codes', () => {
    expect(geolocationErrorMessage(0)).toBe('Location unavailable')
    expect(geolocationErrorMessage(99)).toBe('Location unavailable')
  })
})
