import { useState, useEffect } from 'react'
import { useSettings } from '../store/settings'
import { fetchWeather, type WeatherResponse } from '../lib/openMeteo'
import { fetchAlerts, type NWSAlert } from '../lib/nws'
import { useActiveCoords } from './useActiveCoords'

interface FetchState {
  weather: WeatherResponse | null
  alerts: NWSAlert[]
  error: string | null
  loading: boolean
}

export function useWeather() {
  const { lat, lon, placeName, placeRegion, loading: coordsLoading } = useActiveCoords()
  const tempUnit = useSettings((s) => s.tempUnit)
  const windUnit = useSettings((s) => s.windUnit)
  const refreshMinutes = useSettings((s) => s.refreshMinutes)

  const [state, setState] = useState<FetchState>({
    weather: null,
    alerts: [],
    error: null,
    loading: true,
  })
  const [refreshTick, setRefreshTick] = useState(0)

  const coordsReady = lat !== null && lon !== null

  useEffect(() => {
    if (refreshMinutes <= 0) return
    const id = setInterval(
      () => setRefreshTick((t) => t + 1),
      refreshMinutes * 60_000
    )
    return () => clearInterval(id)
  }, [refreshMinutes])

  useEffect(() => {
    if (coordsLoading || !coordsReady) return

    let cancelled = false

    Promise.all([
      fetchWeather(lat!, lon!, tempUnit, windUnit),
      fetchAlerts(lat!, lon!).catch(() => [] as NWSAlert[]),
    ])
      .then(([weatherData, alertsData]) => {
        if (cancelled) return
        setState({ weather: weatherData, alerts: alertsData, error: null, loading: false })
      })
      .catch(() => {
        if (cancelled) return
        setState((s) => ({ ...s, error: 'Connection failed', loading: false }))
      })

    return () => {
      cancelled = true
    }
  }, [coordsLoading, coordsReady, lat, lon, tempUnit, windUnit, refreshTick])

  const loading = coordsLoading || (coordsReady && state.loading)

  return {
    weather: state.weather,
    alerts: state.alerts,
    error: state.error,
    loading,
    coordsReady,
    placeName,
    placeRegion,
  }
}
