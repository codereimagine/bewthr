import type { TempUnit, WindUnit } from '../store/settings'
import { roundCoord, type LocationPrecision } from './geoPrivacy'

export interface CurrentWeather {
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  is_day: number
  precipitation: number
  weather_code: number
  wind_speed_10m: number
  surface_pressure: number
}

export interface HourlyWeather {
  /** True UTC instants (ISO). Open-Meteo's place-local strings are converted in
   *  fetchWeather; MET.no already sends UTC. */
  time: string[]
  /** IANA zone of the place (Open-Meteo `timezone`) — hour labels use it so a
   *  picked city shows ITS hours, not the device's. Absent from MET.no. */
  timeZone?: string
  temperature_2m: number[]
  weather_code: number[]
  is_day: number[]
  // Continuum (P1): extra hourly fields so the sky can render any hour, not just now.
  precipitation: number[]
  precipitation_probability: number[]
  cloud_cover: number[]
  wind_speed_10m: number[]
}

export interface DailyWeather {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
}

export interface WeatherResponse {
  current: CurrentWeather
  hourly: HourlyWeather
  daily: DailyWeather
}

export async function fetchWeather(
  lat: number,
  lon: number,
  tempUnit: TempUnit,
  windUnit: WindUnit,
  precision: LocationPrecision = 'surrounding'
): Promise<WeatherResponse> {
  const temperatureUnit = tempUnit === 'F' ? 'fahrenheit' : 'celsius'
  // PRIVACY-HARDEN: coordinates rounded to the chosen precision before egress.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${roundCoord(lat, precision)}&longitude=${roundCoord(lon, precision)}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure` +
    `&hourly=temperature_2m,weather_code,is_day,precipitation,precipitation_probability,cloud_cover,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=${encodeURIComponent(temperatureUnit)}` +
    `&wind_speed_unit=${encodeURIComponent(windUnit)}` +
    `&timezone=auto&forecast_days=7`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = (await res.json()) as WeatherResponse & { utc_offset_seconds?: number; timezone?: string }
  return {
    ...data,
    hourly: {
      ...data.hourly,
      time: placeLocalToUtcIso(data.hourly.time, data.utc_offset_seconds ?? 0),
      timeZone: data.timezone,
    },
  }
}

/** With `timezone=auto`, Open-Meteo returns hourly times as the PLACE's local wall
 *  clock with no zone ("2026-10-20T07:00"). `new Date()` reads such strings in the
 *  DEVICE's zone, so for a far-away city "now" landed on the wrong hour (Tokyo from
 *  New York: 13 h off). Convert to true UTC instants with the place's offset; strings
 *  that already carry a zone (MET.no) pass through. Uses the current offset, so an
 *  hour after a DST change inside the forecast window can be 1 h off. */
export function placeLocalToUtcIso(times: string[], offsetSec: number): string[] {
  return times.map((t) =>
    /(?:Z|[+-]\d\d:?\d\d)$/i.test(t)
      ? new Date(t).toISOString()
      : new Date(Date.parse(`${t}Z`) - offsetSec * 1000).toISOString()
  )
}
