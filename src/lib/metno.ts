// MET.no (Norwegian Meteorological Institute) — Locationforecast 2.0 "compact".
// The SECOND rung of bewthr's keyless weather chain: open-meteo → MET.no →
// last-known-cached. Keyless, CORS-enabled, no account. This adapter reshapes
// MET.no's timeseries into bewthr's open-meteo-shaped WeatherResponse so the UI
// is source-agnostic.
//
// MET.no reports Celsius + m/s + its own symbol_code vocabulary, so this file
// owns three translations: temperature/wind unit conversion to the user's
// setting, symbol_code → WMO weather code (bewthr's icon contract), and a
// per-day max/min aggregation for the 7-day strip. Coordinates are rounded at
// egress (PRIVACY-HARDEN-2DP). Browsers send their own User-Agent (the header is
// forbidden to override in fetch), which MET.no accepts for browser origins.

import type { TempUnit, WindUnit } from '../store/settings'
import { roundCoord } from './geoPrivacy'
import type { CurrentWeather, DailyWeather, HourlyWeather, WeatherResponse } from './openMeteo'

const ENDPOINT = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
const HOURLY_STEPS = 24
const DAILY_DAYS = 7

interface MetnoInstant {
  air_temperature?: number
  relative_humidity?: number
  wind_speed?: number
  air_pressure_at_sea_level?: number
}
interface MetnoStep {
  time: string
  data: {
    instant: { details: MetnoInstant }
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } }
    next_6_hours?: { summary?: { symbol_code?: string } }
    next_12_hours?: { summary?: { symbol_code?: string } }
  }
}
interface MetnoResponse {
  properties?: { timeseries?: MetnoStep[] }
}

// MET.no symbol_code base (suffix _day/_night/_polartwilight stripped) → WMO code.
const SYMBOL_TO_WMO: Record<string, number> = {
  clearsky: 0,
  fair: 1,
  partlycloudy: 2,
  cloudy: 3,
  fog: 45,
  lightrainshowers: 61,
  lightrain: 61,
  rainshowers: 63,
  rain: 63,
  heavyrainshowers: 65,
  heavyrain: 65,
  lightsleetshowers: 66,
  lightsleet: 66,
  sleetshowers: 66,
  sleet: 66,
  heavysleetshowers: 67,
  heavysleet: 67,
  lightsnowshowers: 71,
  lightsnow: 71,
  snowshowers: 73,
  snow: 73,
  heavysnowshowers: 75,
  heavysnow: 75,
}

function symbolOf(step: MetnoStep): string {
  const d = step.data
  return (
    d.next_1_hours?.summary?.symbol_code ??
    d.next_6_hours?.summary?.symbol_code ??
    d.next_12_hours?.summary?.symbol_code ??
    ''
  )
}

function wmoFromSymbol(symbol: string): number {
  const base = symbol.replace(/_(day|night|polartwilight)$/, '')
  if (base.includes('andthunder')) return base.startsWith('heavy') ? 99 : 95
  return SYMBOL_TO_WMO[base] ?? 3 // unknown → overcast, an honest neutral icon
}

function isDayFromSymbol(symbol: string): number {
  return symbol.endsWith('_night') ? 0 : 1
}

function convTemp(c: number, unit: TempUnit): number {
  const v = unit === 'F' ? (c * 9) / 5 + 32 : c
  return Math.round(v * 10) / 10
}

function convWind(ms: number, unit: WindUnit): number {
  const factor = unit === 'kmh' ? 3.6 : unit === 'mph' ? 2.2369362920544 : unit === 'kn' ? 1.9438444924406 : 1
  return Math.round(ms * factor * 10) / 10
}

export async function fetchWeatherMetno(
  lat: number,
  lon: number,
  tempUnit: TempUnit,
  windUnit: WindUnit
): Promise<WeatherResponse> {
  const url = `${ENDPOINT}?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MET.no fetch failed (${res.status})`)

  const body = (await res.json()) as MetnoResponse
  const ts = body.properties?.timeseries ?? []
  if (ts.length === 0) throw new Error('MET.no returned no timeseries')

  const first = ts[0]
  const firstSym = symbolOf(first)
  const inst = first.data.instant.details

  const current: CurrentWeather = {
    temperature_2m: convTemp(inst.air_temperature ?? 0, tempUnit),
    relative_humidity_2m: Math.round(inst.relative_humidity ?? 0),
    // MET.no has no feels-like; the actual air temperature is the honest fallback
    apparent_temperature: convTemp(inst.air_temperature ?? 0, tempUnit),
    is_day: isDayFromSymbol(firstSym),
    precipitation: first.data.next_1_hours?.details?.precipitation_amount ?? 0,
    weather_code: wmoFromSymbol(firstSym),
    wind_speed_10m: convWind(inst.wind_speed ?? 0, windUnit),
    surface_pressure: inst.air_pressure_at_sea_level ?? 0, // hPa, matches open-meteo default
  }

  const hourlySteps = ts.slice(0, HOURLY_STEPS)
  const hourly: HourlyWeather = {
    time: hourlySteps.map((s) => s.time),
    temperature_2m: hourlySteps.map((s) => convTemp(s.data.instant.details.air_temperature ?? 0, tempUnit)),
    weather_code: hourlySteps.map((s) => wmoFromSymbol(symbolOf(s))),
    is_day: hourlySteps.map((s) => isDayFromSymbol(symbolOf(s))),
  }

  // Aggregate the timeseries into per-day max/min; the symbol nearest local noon
  // represents the day. Group by the date portion of the ISO timestamp.
  const byDay = new Map<string, { temps: number[]; noon?: { diff: number; sym: string } }>()
  for (const s of ts) {
    const t = s.data.instant.details.air_temperature
    if (t == null) continue
    const day = s.time.slice(0, 10)
    const hour = Number(s.time.slice(11, 13))
    const rec = byDay.get(day) ?? { temps: [] }
    rec.temps.push(t)
    const diff = Math.abs(hour - 12)
    if (!rec.noon || diff < rec.noon.diff) rec.noon = { diff, sym: symbolOf(s) }
    byDay.set(day, rec)
  }
  const days = [...byDay.entries()].slice(0, DAILY_DAYS)
  const daily: DailyWeather = {
    time: days.map(([day]) => day),
    weather_code: days.map(([, rec]) => wmoFromSymbol(rec.noon?.sym ?? '')),
    temperature_2m_max: days.map(([, rec]) => convTemp(Math.max(...rec.temps), tempUnit)),
    temperature_2m_min: days.map(([, rec]) => convTemp(Math.min(...rec.temps), tempUnit)),
  }

  return { current, hourly, daily }
}
