import type { ReactElement } from 'react'

// Weather icons are Meteocons animated fill SVGs (@meteocons/svg, MIT license,
// by Bas Milius). Each icon is imported as a Vite asset URL — the SVG file is
// bundled into production and served same-origin, so the existing CSP
// (img-src 'self') is sufficient. No external host, no CDN.
//
// SMIL animations embedded in each SVG (<animate>, <animateTransform>) play
// natively when the SVG is rendered as an <img> tag — no JS engine required.
//
// Sizing follows the parent's font-size via inline `width: 1em; height: 1em`,
// matching the previous SVG icon contract so .hero-icon (52px) / .hour-icon
// (20px) / .day-icon (18px) CSS keeps driving the rendered size.

import clearDay            from '@meteocons/svg/fill/clear-day.svg'
import clearNight          from '@meteocons/svg/fill/clear-night.svg'
import partlyCloudyDay     from '@meteocons/svg/fill/partly-cloudy-day.svg'
import partlyCloudyNight   from '@meteocons/svg/fill/partly-cloudy-night.svg'
import overcastDay         from '@meteocons/svg/fill/overcast-day.svg'
import overcastNight       from '@meteocons/svg/fill/overcast-night.svg'
import fogDay              from '@meteocons/svg/fill/fog-day.svg'
import fogNight            from '@meteocons/svg/fill/fog-night.svg'
import drizzle             from '@meteocons/svg/fill/drizzle.svg'
import rain                from '@meteocons/svg/fill/rain.svg'
import sleet               from '@meteocons/svg/fill/sleet.svg'
import snow                from '@meteocons/svg/fill/snow.svg'
import thunderstormsDay    from '@meteocons/svg/fill/thunderstorms-day.svg'
import thunderstormsNight  from '@meteocons/svg/fill/thunderstorms-night.svg'
import notAvailable        from '@meteocons/svg/fill/not-available.svg'

// Codes whose icon depends on day/night (sun vs moon, etc.).
const DAY_NIGHT_BY_CODE: Record<number, [string, string]> = {
  0:  [clearDay,         clearNight],
  1:  [clearDay,         clearNight],
  2:  [partlyCloudyDay,  partlyCloudyNight],
  3:  [overcastDay,      overcastNight],
  45: [fogDay,           fogNight],
  48: [fogDay,           fogNight],
  95: [thunderstormsDay, thunderstormsNight],
  96: [thunderstormsDay, thunderstormsNight],
  99: [thunderstormsDay, thunderstormsNight],
}

// Codes whose icon is the same regardless of day/night (precipitation forms).
const ICONS_BY_CODE: Record<number, string> = {
  51: drizzle,
  53: drizzle,
  55: drizzle,
  56: drizzle,
  57: drizzle,
  61: rain,
  63: rain,
  65: rain,
  66: sleet,
  67: sleet,
  71: snow,
  73: snow,
  75: snow,
  77: snow,
  80: rain,
  81: rain,
  82: rain,
  85: snow,
  86: snow,
}

function iconImg(src: string): ReactElement {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: '1em', height: '1em', display: 'block', userSelect: 'none' }}
    />
  )
}

export function getWeatherIcon(code: number, isDay: number | boolean = 1): ReactElement {
  const dayNight = DAY_NIGHT_BY_CODE[code]
  const day = !(isDay === 0 || isDay === false)
  if (dayNight) return iconImg(dayNight[day ? 0 : 1])
  const src = ICONS_BY_CODE[code]
  return iconImg(src ?? notAvailable)
}

export function getCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm + hail',
    99: 'Severe thunderstorm',
  }
  return conditions[code] || 'Unknown'
}
