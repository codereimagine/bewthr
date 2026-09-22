import { useMemo } from 'react'
import { useSettings } from '../store/settings'
import { fetchWeather, type WeatherResponse } from '../lib/openMeteo'
import { fetchWeatherMetno } from '../lib/metno'
import { fetchAlerts, type NWSAlert } from '../lib/nws'
import { roundCoord } from '../lib/geoPrivacy'
import { useFeed, type DataFeed } from '../lib/feed'
import { useActiveCoords } from './useActiveCoords'

export function useWeather() {
  const { lat, lon, placeName, placeRegion, loading: coordsLoading } = useActiveCoords()
  const tempUnit = useSettings((s) => s.tempUnit)
  const windUnit = useSettings((s) => s.windUnit)
  const locationPrecision = useSettings((s) => s.locationPrecision)
  const refreshMinutes = useSettings((s) => s.refreshMinutes)

  const coordsReady = lat !== null && lon !== null
  const refreshMs = refreshMinutes > 0 ? refreshMinutes * 60_000 : undefined
  // Feed ids fold in the rounded place + units + precision so distinct contexts
  // cache apart (and never carry precise coords into a storage key). Changing
  // precision re-keys the cache so a coarser reading never reuses a finer one.
  const ctx = coordsReady
    ? `${roundCoord(lat!, locationPrecision)},${roundCoord(lon!, locationPrecision)}:${tempUnit}:${windUnit}:${locationPrecision}`
    : 'idle'

  // WEATHER — the keyless chain: open-meteo → MET.no → last-known-cached.
  const weatherFeed = useMemo<DataFeed<WeatherResponse>>(
    () => ({
      id: `wx:${ctx}`,
      persistKey: `wx:${ctx}`,
      refreshMs,
      enabled: coordsReady,
      fetchLive: async () => {
        try {
          return await fetchWeather(lat!, lon!, tempUnit, windUnit, locationPrecision)
        } catch {
          return await fetchWeatherMetno(lat!, lon!, tempUnit, windUnit, locationPrecision)
        }
      },
    }),
    [ctx, refreshMs, coordsReady, lat, lon, tempUnit, windUnit, locationPrecision]
  )

  // ALERTS — NWS only, ephemeral (they expire); no persistence, empty fallback.
  const alertsFeed = useMemo<DataFeed<NWSAlert[]>>(
    () => ({
      id: `alerts:${ctx}`,
      refreshMs,
      enabled: coordsReady,
      fetchLive: () => fetchAlerts(lat!, lon!, locationPrecision),
    }),
    [ctx, refreshMs, coordsReady, lat, lon, locationPrecision]
  )

  const wx = useFeed(weatherFeed)
  const al = useFeed(alertsFeed)

  const loading = coordsLoading || (coordsReady && wx.data == null && wx.error == null)

  return {
    weather: wx.data,
    alerts: al.data ?? [],
    error: wx.data == null ? wx.error : null,
    loading,
    stale: wx.stale, // true = showing last-known reading, live pull is down
    coordsReady,
    placeName,
    placeRegion,
  }
}
