import { useEffect, useMemo, useState } from 'react'
import {
  getSun,
  getMoon,
  getPlanets,
  type SunInfo,
  type MoonInfo,
  type PlanetInfo,
} from '../lib/astronomy'
import {
  getVisibleConstellations,
  type ConstellationInfo,
} from '../lib/constellations'

export interface SkyBundle {
  sun: SunInfo
  moon: MoonInfo
  planets: PlanetInfo[]
  constellations: ConstellationInfo[]
  isDay: boolean
  computedAt: Date
}

// 60s render-tick for the live countdown ("Golden hour in 2h 14m").
// Distinct from the user-facing data refresh interval (refreshMinutes
// in settings) which only governs network refetch in useWeather; sky
// data is computed locally so its tick is purely a display cadence.
const REFRESH_MS = 60_000

export function useSky(lat: number | null, lon: number | null): SkyBundle | null {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return useMemo(() => {
    void tick
    if (lat === null || lon === null) return null
    const now = new Date()
    const sun = getSun(lat, lon, now)
    return {
      sun,
      moon: getMoon(lat, lon, now),
      planets: getPlanets(lat, lon, now),
      constellations: getVisibleConstellations(lat, lon, now),
      isDay: sun.isDay,
      computedAt: now,
    }
  }, [lat, lon, tick])
}
