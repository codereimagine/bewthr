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
