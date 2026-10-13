import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchWeatherMetno } from './metno'

// Continuum P1 parity: the extra hourly fields must always be finite numbers —
// missing MET.no fields fall back to 0, never NaN (the sky math can't take NaN).
function stubMetno(step: unknown) {
  const ts = Array.from({ length: 24 }, () => step)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ properties: { timeseries: ts } }) })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('metno hourly — Continuum fields', () => {
  it('defaults missing precipitation / probability / cloud / wind to 0, never NaN', async () => {
    stubMetno({ time: '2026-10-13T12:00:00Z', data: { instant: { details: {} } } })
    const { hourly } = await fetchWeatherMetno(40, -74, 'C', 'kmh')
    for (const arr of [hourly.precipitation, hourly.precipitation_probability, hourly.cloud_cover, hourly.wind_speed_10m]) {
      expect(arr).toHaveLength(24)
      expect(arr.every((v) => Number.isFinite(v))).toBe(true)
      expect(arr.every((v) => v === 0)).toBe(true)
    }
  })

  it('reads the Continuum fields when MET.no provides them', async () => {
    stubMetno({
      time: '2026-10-13T12:00:00Z',
      data: {
        instant: { details: { air_temperature: 20, wind_speed: 5, cloud_area_fraction: 42 } },
        next_1_hours: { summary: { symbol_code: 'rain' }, details: { precipitation_amount: 1.2, probability_of_precipitation: 70 } },
      },
    })
    const { hourly } = await fetchWeatherMetno(40, -74, 'C', 'kmh')
    expect(hourly.cloud_cover[0]).toBe(42)
    expect(hourly.precipitation[0]).toBe(1.2)
    expect(hourly.precipitation_probability[0]).toBe(70)
    expect(hourly.wind_speed_10m[0]).toBeGreaterThan(0)
  })
})
