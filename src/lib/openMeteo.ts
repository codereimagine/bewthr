import type { TempUnit, WindUnit } from '../store/settings'

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
  time: string[]
  temperature_2m: number[]
  weather_code: number[]
  is_day: number[]
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
  windUnit: WindUnit
): Promise<WeatherResponse> {
  const temperatureUnit = tempUnit === 'F' ? 'fahrenheit' : 'celsius'
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure` +
    `&hourly=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=${encodeURIComponent(temperatureUnit)}` +
    `&wind_speed_unit=${encodeURIComponent(windUnit)}` +
    `&timezone=auto&forecast_days=7`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  return res.json()
}
