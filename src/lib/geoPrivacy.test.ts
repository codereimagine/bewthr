import { describe, it, expect } from 'vitest'
import { roundCoord, PRECISION_DECIMALS, EGRESS_DECIMALS } from './geoPrivacy'

// Times Square — a coordinate with more precision than any level allows.
const LAT = 40.758896
const LON = -73.98513

const decimalsOf = (n: number) => {
  const s = String(n)
  const i = s.indexOf('.')
  return i < 0 ? 0 : s.length - i - 1
}

describe('roundCoord — 3-level location precision', () => {
  it('defaults to surrounding (2dp) — no privacy regression from the old fixed behaviour', () => {
    expect(roundCoord(LAT)).toBe(40.76)
    expect(roundCoord(LON)).toBe(-73.99)
    expect(EGRESS_DECIMALS).toBe(2)
  })

  it('exact: precise coordinate leaves unchanged', () => {
    expect(roundCoord(LAT, 'exact')).toBe(LAT)
    expect(roundCoord(LON, 'exact')).toBe(LON)
  })

  it('surrounding: 2dp (~1.1 km)', () => {
    expect(roundCoord(LAT, 'surrounding')).toBe(40.76)
    expect(roundCoord(LON, 'surrounding')).toBe(-73.99)
  })

  it('general: 1dp (~11 km)', () => {
    expect(roundCoord(LAT, 'general')).toBe(40.8)
    expect(roundCoord(LON, 'general')).toBe(-74)
  })

  it('never emits more precision than the level allows', () => {
    expect(decimalsOf(roundCoord(LAT, 'surrounding'))).toBeLessThanOrEqual(2)
    expect(decimalsOf(roundCoord(LAT, 'general'))).toBeLessThanOrEqual(1)
  })

  it('precision → decimals is the documented ladder', () => {
    expect(PRECISION_DECIMALS).toEqual({ exact: null, surrounding: 2, general: 1 })
  })
})
