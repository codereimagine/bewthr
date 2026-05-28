import { useState, useEffect } from 'react'

interface GeolocationState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
}

const HAS_GEOLOCATION =
  typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined'

// Generic, code-based messages — never the browser-provided err.message,
// which can include partial location hints on some platforms.
function geolocationErrorMessage(code: number): string {
  if (code === 1) return 'Location permission denied'
  if (code === 2) return 'Location unavailable'
  if (code === 3) return 'Location request timed out'
  return 'Location unavailable'
}

const INITIAL_STATE: GeolocationState = HAS_GEOLOCATION
  ? { lat: null, lon: null, error: null, loading: true }
  : { lat: null, lon: null, error: 'Geolocation not supported', loading: false }

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE)

  useEffect(() => {
    if (!HAS_GEOLOCATION) return

    let cancelled = false

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        setState({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        if (cancelled) return
        setState({
          lat: null,
          lon: null,
          error: geolocationErrorMessage(err.code),
          loading: false,
        })
      },
      { timeout: 10000 }
    )

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
