import { Observer, Horizon } from 'astronomy-engine'
import {
  azimuthToCompass,
  altitudeState,
  type Compass,
  type AltitudeState,
} from './astronomy'

export interface ConstellationCatalogEntry {
  name: string
  ra: number
  dec: number
}

export const CONSTELLATIONS: ConstellationCatalogEntry[] = [
  { name: 'Orion', ra: 5.5, dec: 0 },
  { name: 'Ursa Major', ra: 11.0, dec: 55 },
  { name: 'Ursa Minor', ra: 15.0, dec: 75 },
  { name: 'Cassiopeia', ra: 1.0, dec: 60 },
  { name: 'Cygnus', ra: 20.5, dec: 40 },
  { name: 'Leo', ra: 10.5, dec: 15 },
  { name: 'Scorpius', ra: 16.5, dec: -30 },
  { name: 'Sagittarius', ra: 19.0, dec: -25 },
  { name: 'Taurus', ra: 4.5, dec: 18 },
  { name: 'Gemini', ra: 7.0, dec: 25 },
]

export interface ConstellationInfo {
  name: string
  altitude: number
  azimuth: number
  direction: Compass
  state: AltitudeState
  aboveHorizon: boolean
}

export function getVisibleConstellations(
  lat: number,
  lon: number,
  date: Date = new Date(),
): ConstellationInfo[] {
  const observer = new Observer(lat, lon, 0)
  const later = new Date(date.getTime() + 30 * 60 * 1000)

  return CONSTELLATIONS.map(({ name, ra, dec }) => {
    const horiz = Horizon(date, observer, ra, dec, 'normal')
    const horizLater = Horizon(later, observer, ra, dec, 'normal')
    return {
      name,
      altitude: horiz.altitude,
      azimuth: horiz.azimuth,
      direction: azimuthToCompass(horiz.azimuth),
      state: altitudeState(horiz.altitude, horizLater.altitude),
      aboveHorizon: horiz.altitude > 0,
    }
  })
    .filter((c) => c.aboveHorizon)
    .sort((a, b) => b.altitude - a.altitude)
}
