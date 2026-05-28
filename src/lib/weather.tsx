import type { ComponentProps, ComponentType, ReactElement } from 'react'

// Weather icons are Meteocons animated fill SVGs (@meteocons/svg, MIT license,
// by Bas Milius), rendered as INLINE live-DOM <svg> via vite-plugin-svgr's
// `?react` import — NOT as <img src>.
//
// Why inline and not <img>: each icon animates via embedded SMIL
// (<animateTransform>). WebKit — which backs every browser on iOS — leaves a
// static "ghost" of the first frame painted underneath when SMIL runs inside an
// <img> tag (most visible on the large hero sun; invisible at hourly size).
// Rendering the SVG as live DOM animates cleanly on every browser. svgr runs
// with svgo disabled so the SMIL elements and per-file gradient IDs survive
// untouched.
//
// Sizing follows the parent's font-size via width/height="1em" ATTRIBUTES
// (presentation attributes, not inline style — so the strict CSP, style-src
// 'self' with no 'unsafe-inline', never blocks it). .hero-icon (88px) /
// .hour-icon (32px) / .day-icon (30px) CSS keeps driving the rendered size.

import ClearDay            from '@meteocons/svg/fill/clear-day.svg?react'
import ClearNight          from '@meteocons/svg/fill/clear-night.svg?react'
import PartlyCloudyDay     from '@meteocons/svg/fill/partly-cloudy-day.svg?react'
import PartlyCloudyNight   from '@meteocons/svg/fill/partly-cloudy-night.svg?react'
import OvercastDay         from '@meteocons/svg/fill/overcast-day.svg?react'
import OvercastNight       from '@meteocons/svg/fill/overcast-night.svg?react'
import FogDay              from '@meteocons/svg/fill/fog-day.svg?react'
import FogNight            from '@meteocons/svg/fill/fog-night.svg?react'
import Drizzle             from '@meteocons/svg/fill/drizzle.svg?react'
import Rain                from '@meteocons/svg/fill/rain.svg?react'
import Sleet               from '@meteocons/svg/fill/sleet.svg?react'
import Snow                from '@meteocons/svg/fill/snow.svg?react'
import ThunderstormsDay    from '@meteocons/svg/fill/thunderstorms-day.svg?react'
import ThunderstormsNight  from '@meteocons/svg/fill/thunderstorms-night.svg?react'
import NotAvailable        from '@meteocons/svg/fill/not-available.svg?react'

type IconComponent = ComponentType<ComponentProps<'svg'>>

// Codes whose icon depends on day/night (sun vs moon, etc.).
const DAY_NIGHT_BY_CODE: Record<number, [IconComponent, IconComponent]> = {
  0:  [ClearDay,         ClearNight],
  1:  [ClearDay,         ClearNight],
  2:  [PartlyCloudyDay,  PartlyCloudyNight],
  3:  [OvercastDay,      OvercastNight],
  45: [FogDay,           FogNight],
  48: [FogDay,           FogNight],
  95: [ThunderstormsDay, ThunderstormsNight],
  96: [ThunderstormsDay, ThunderstormsNight],
  99: [ThunderstormsDay, ThunderstormsNight],
}

// Codes whose icon is the same regardless of day/night (precipitation forms).
const ICONS_BY_CODE: Record<number, IconComponent> = {
  51: Drizzle,
  53: Drizzle,
  55: Drizzle,
  56: Drizzle,
  57: Drizzle,
  61: Rain,
  63: Rain,
  65: Rain,
  66: Sleet,
  67: Sleet,
  71: Snow,
  73: Snow,
  75: Snow,
  77: Snow,
  80: Rain,
  81: Rain,
  82: Rain,
  85: Snow,
  86: Snow,
}

function iconEl(Icon: IconComponent): ReactElement {
  return <Icon width="1em" height="1em" aria-hidden="true" focusable="false" />
}

export function getWeatherIcon(code: number, isDay: number | boolean = 1): ReactElement {
  const dayNight = DAY_NIGHT_BY_CODE[code]
  const day = !(isDay === 0 || isDay === false)
  if (dayNight) return iconEl(dayNight[day ? 0 : 1])
  return iconEl(ICONS_BY_CODE[code] ?? NotAvailable)
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
