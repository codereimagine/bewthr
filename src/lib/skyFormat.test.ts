import { describe, it, expect } from 'vitest'
import { formatSunTime, formatTimeRange } from './skyFormat'

// Anchorage sunset 2026-11-01 = 01:57 UTC (USNO: 16:57 AKST)
const set = new Date('2026-11-02T01:57:00Z')

describe('Sky Tonight times read the place clock', () => {
  it('formats in the place zone, 12h and 24h', () => {
    expect(formatSunTime(set, '12', 'America/Anchorage')).toBe('4:57pm')
    expect(formatSunTime(set, '24', 'America/Anchorage')).toBe('16:57')
    expect(formatSunTime(set, '12', 'Asia/Tokyo')).toBe('10:57am')
  })
  it('ranges use the place zone', () => {
    expect(formatTimeRange(new Date('2026-11-02T00:44:00Z'), new Date('2026-11-02T02:26:00Z'), '12', 'America/Anchorage')).toBe('3:44pm – 5:26pm')
  })
  it('falls back to the device zone until the place zone arrives', () => {
    expect(formatSunTime(set, '12')).toBe(formatSunTime(set, '12', Intl.DateTimeFormat().resolvedOptions().timeZone))
  })
  it('no date shows a dash', () => {
    expect(formatSunTime(null, '12', 'America/Anchorage')).toBe('—')
  })
})
