import { describe, it, expect } from 'vitest'
import { wxBucket, wxAccent, WX_ACCENT } from './weatherTheme'

describe('wxBucket — WMO weather_code → accent bucket', () => {
  it('clear splits day/night by is_day', () => {
    expect(wxBucket(0, 1)).toBe('clear-day')
    expect(wxBucket(1, 1)).toBe('clear-day')
    expect(wxBucket(0, 0)).toBe('clear-night')
    expect(wxBucket(1, false)).toBe('clear-night')
  })

  it('maps partly / cloud / fog / rain / snow / storm', () => {
    expect(wxBucket(2)).toBe('partly')
    expect(wxBucket(3)).toBe('cloud')
    expect(wxBucket(45)).toBe('fog')
    expect(wxBucket(48)).toBe('fog')
    expect(wxBucket(51)).toBe('rain')
    expect(wxBucket(63)).toBe('rain')
    expect(wxBucket(80)).toBe('rain')
    expect(wxBucket(71)).toBe('snow')
    expect(wxBucket(75)).toBe('snow')
    expect(wxBucket(86)).toBe('snow')
    expect(wxBucket(95)).toBe('storm')
    expect(wxBucket(96)).toBe('storm')
    expect(wxBucket(99)).toBe('storm')
  })

  it('clear-day keeps the signature orange', () => {
    expect(WX_ACCENT['clear-day']).toBe('#ff6600')
    expect(wxAccent(0, 1)).toBe('#ff6600')
  })

  it('every bucket has a valid hex accent', () => {
    Object.values(WX_ACCENT).forEach((h) => expect(h).toMatch(/^#[0-9a-f]{6}$/))
  })
})
