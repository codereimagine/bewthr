import {
  Body,
  Observer,
  Equator,
  Horizon,
  Illumination,
  MoonPhase,
  SearchRiseSet,
  SearchAltitude,
  SearchHourAngle,
} from 'astronomy-engine'

const SUN = Body.Sun
const MOON = Body.Moon

const ALT_GOLDEN_DEG = 6
const ALT_BLUE_DEG = -4
const ALT_CIVIL_DEG = -6
const ALT_NAUTICAL_DEG = -12
const ALT_ASTRO_DEG = -18

export interface SunInfo {
  rise: Date | null
  set: Date | null
  solarNoon: Date | null
  goldenHourStart: Date | null
  goldenHourEnd: Date | null
  blueHourStart: Date | null
  blueHourEnd: Date | null
  civilTwilightEnd: Date | null
  nauticalTwilightEnd: Date | null
  astroTwilightEnd: Date | null
  altitude: number
  azimuth: number
  isDay: boolean
}

export function getSun(lat: number, lon: number, date: Date = new Date()): SunInfo {
  const observer = new Observer(lat, lon, 0)

  const equ = Equator(SUN, date, observer, true, true)
  const horiz = Horizon(date, observer, equ.ra, equ.dec, 'normal')
  const altitude = horiz.altitude
  const azimuth = horiz.azimuth
  const isDay = altitude > 0

  const rise = SearchRiseSet(SUN, observer, +1, date, 1)
  const set = SearchRiseSet(SUN, observer, -1, date, 1)

  const transit = SearchHourAngle(SUN, observer, 0, date)
  const solarNoon = transit ? transit.time.date : null

  const findDescending = (alt: number) => {
    const t = SearchAltitude(SUN, observer, -1, date, 1, alt)
    return t ? t.date : null
  }

  return {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
    solarNoon,
    goldenHourStart: findDescending(ALT_GOLDEN_DEG),
    goldenHourEnd: findDescending(ALT_BLUE_DEG),
    blueHourStart: findDescending(ALT_BLUE_DEG),
    blueHourEnd: findDescending(ALT_CIVIL_DEG),
    civilTwilightEnd: findDescending(ALT_CIVIL_DEG),
    nauticalTwilightEnd: findDescending(ALT_NAUTICAL_DEG),
    astroTwilightEnd: findDescending(ALT_ASTRO_DEG),
    altitude,
    azimuth,
    isDay,
  }
}

// Lightweight sun altitude (degrees) at an arbitrary instant — just the horizon
// coordinate, none of getSun's rise/set/twilight searches. Cheap enough to sample
// across the day and to call on a live tick for the sun-path arc.
export function sunAltitude(lat: number, lon: number, date: Date): number {
  const observer = new Observer(lat, lon, 0)
  const equ = Equator(SUN, date, observer, true, true)
  return Horizon(date, observer, equ.ra, equ.dec, 'normal').altitude
}

// Lightweight horizontal coordinates (altitude + azimuth, degrees) for the sun or
// moon at an instant — just Observer→Equator→Horizon, cheap enough to sample the full
// path and to call every frame. Azimuth is clockwise from north (N 0, E 90, S 180, W 270).
export function sunAltAz(lat: number, lon: number, date: Date): { altitude: number; azimuth: number } {
  const o = new Observer(lat, lon, 0)
  const equ = Equator(SUN, date, o, true, true)
  const h = Horizon(date, o, equ.ra, equ.dec, 'normal')
  return { altitude: h.altitude, azimuth: h.azimuth }
}
export function moonAltAz(lat: number, lon: number, date: Date): { altitude: number; azimuth: number } {
  const o = new Observer(lat, lon, 0)
  const equ = Equator(MOON, date, o, true, true)
  const h = Horizon(date, o, equ.ra, equ.dec, 'normal')
  return { altitude: h.altitude, azimuth: h.azimuth }
}

// The daylight window to draw the sun-path arc over: rise on the left, set on the
// right, always in order (rise < set) and bracketing `date`. getSun's rise/set are
// the NEXT ones, so after solar noon the next rise is tomorrow while the next set is
// today — this resolves that to today's actual sunrise so the arc spans one real day.
export function sunArcWindow(
  lat: number,
  lon: number,
  date: Date,
): { rise: Date | null; set: Date | null; solarNoon: Date | null } {
  const observer = new Observer(lat, lon, 0)
  const nextRise = SearchRiseSet(SUN, observer, +1, date, 1)
  const nextSet = SearchRiseSet(SUN, observer, -1, date, 1)
  let rise = nextRise ? nextRise.date : null
  const set = nextSet ? nextSet.date : null
  // Currently daytime (set comes before the next rise): use this morning's rise.
  if (rise && set && set.getTime() < rise.getTime()) {
    const dayAgo = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    const prevRise = SearchRiseSet(SUN, observer, +1, dayAgo, 2)
    if (prevRise) rise = prevRise.date
  }
  // Solar noon OF THIS window — the transit at/after the window's rise — not getSun's
  // "next transit", which is tomorrow once it's past local noon (that threw the noon
  // marker to the far-right edge in the afternoon).
  let solarNoon: Date | null = null
  if (rise) {
    const transit = SearchHourAngle(SUN, observer, 0, rise)
    solarNoon = transit ? transit.time.date : null
  }
  return { rise, set, solarNoon }
}

export type MoonPhaseName =
  | 'New'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface MoonInfo {
  rise: Date | null
  set: Date | null
  phaseName: MoonPhaseName
  phaseAngle: number
  illumination: number
  altitude: number
  azimuth: number
  aboveHorizon: boolean
}

function moonPhaseName(angle: number): MoonPhaseName {
  const a = ((angle % 360) + 360) % 360
  if (a < 22.5 || a >= 337.5) return 'New'
  if (a < 67.5) return 'Waxing Crescent'
  if (a < 112.5) return 'First Quarter'
  if (a < 157.5) return 'Waxing Gibbous'
  if (a < 202.5) return 'Full'
  if (a < 247.5) return 'Waning Gibbous'
  if (a < 292.5) return 'Last Quarter'
  return 'Waning Crescent'
}

export type Compass = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

export function azimuthToCompass(az: number): Compass {
  const a = ((az % 360) + 360) % 360
  if (a < 22.5 || a >= 337.5) return 'N'
  if (a < 67.5) return 'NE'
  if (a < 112.5) return 'E'
  if (a < 157.5) return 'SE'
  if (a < 202.5) return 'S'
  if (a < 247.5) return 'SW'
  if (a < 292.5) return 'W'
  return 'NW'
}

export type AltitudeState = 'rising' | 'low' | 'mid' | 'high' | 'setting'

export function altitudeState(alt: number, altLater: number): AltitudeState {
  if (alt < 5) return altLater > alt ? 'rising' : 'setting'
  if (alt < 25) return 'low'
  if (alt < 55) return 'mid'
  return 'high'
}

export type Brightness = 'bright' | 'moderate' | 'dim'

export function magnitudeToBrightness(mag: number): Brightness {
  if (mag < 0) return 'bright'
  if (mag < 2) return 'moderate'
  return 'dim'
}

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn'

export interface PlanetInfo {
  name: PlanetName
  altitude: number
  azimuth: number
  direction: Compass
  state: AltitudeState
  magnitude: number
  brightness: Brightness
  aboveHorizon: boolean
}

const CLASSICAL_PLANETS: { name: PlanetName; body: Body }[] = [
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
]

export function getPlanets(lat: number, lon: number, date: Date = new Date()): PlanetInfo[] {
  const observer = new Observer(lat, lon, 0)
  const later = new Date(date.getTime() + 30 * 60 * 1000)

  return CLASSICAL_PLANETS.map(({ name, body }) => {
    const equ = Equator(body, date, observer, true, true)
    const horiz = Horizon(date, observer, equ.ra, equ.dec, 'normal')

    const equLater = Equator(body, later, observer, true, true)
    const horizLater = Horizon(later, observer, equLater.ra, equLater.dec, 'normal')

    const illum = Illumination(body, date)

    return {
      name,
      altitude: horiz.altitude,
      azimuth: horiz.azimuth,
      direction: azimuthToCompass(horiz.azimuth),
      state: altitudeState(horiz.altitude, horizLater.altitude),
      magnitude: illum.mag,
      brightness: magnitudeToBrightness(illum.mag),
      aboveHorizon: horiz.altitude > 0,
    }
  })
}

// Lightweight moon altitude (degrees) at an instant — the moon counterpart of
// sunAltitude; cheap enough to sample across the night and on a live tick.
export function moonAltitude(lat: number, lon: number, date: Date): number {
  const observer = new Observer(lat, lon, 0)
  const equ = Equator(MOON, date, observer, true, true)
  return Horizon(date, observer, equ.ra, equ.dec, 'normal').altitude
}

// The moon-path window to draw the arc over — moon counterpart of sunArcWindow.
// rise < set, bracketing `date`; `transit` is the moon's highest point (the apex).
export function moonArcWindow(
  lat: number,
  lon: number,
  date: Date,
): { rise: Date | null; set: Date | null; transit: Date | null } {
  const observer = new Observer(lat, lon, 0)
  const nextRise = SearchRiseSet(MOON, observer, +1, date, 1)
  const nextSet = SearchRiseSet(MOON, observer, -1, date, 1)
  let rise = nextRise ? nextRise.date : null
  const set = nextSet ? nextSet.date : null
  // Moon currently up (set precedes the next rise): use the rise it came up on.
  if (rise && set && set.getTime() < rise.getTime()) {
    const dayAgo = new Date(date.getTime() - 25 * 60 * 60 * 1000) // moon-day ~24.8h
    const prevRise = SearchRiseSet(MOON, observer, +1, dayAgo, 2)
    if (prevRise) rise = prevRise.date
  }
  let transit: Date | null = null
  if (rise) {
    const t = SearchHourAngle(MOON, observer, 0, rise)
    transit = t ? t.time.date : null
  }
  return { rise, set, transit }
}

export function getMoon(lat: number, lon: number, date: Date = new Date()): MoonInfo {
  const observer = new Observer(lat, lon, 0)

  const equ = Equator(MOON, date, observer, true, true)
  const horiz = Horizon(date, observer, equ.ra, equ.dec, 'normal')

  const rise = SearchRiseSet(MOON, observer, +1, date, 1)
  const set = SearchRiseSet(MOON, observer, -1, date, 1)

  const phaseAngle = MoonPhase(date)
  const illum = Illumination(MOON, date)

  return {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
    phaseName: moonPhaseName(phaseAngle),
    phaseAngle,
    illumination: illum.phase_fraction,
    altitude: horiz.altitude,
    azimuth: horiz.azimuth,
    aboveHorizon: horiz.altitude > 0,
  }
}
