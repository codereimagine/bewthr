import { usePlaces } from '../store/places'
import { useGeo } from '../store/geo'

export interface ActiveCoordsState {
  lat: number | null
  lon: number | null
  placeName: string
  placeRegion: string
  loading: boolean
}

// Single source of truth for the user's active location. Returns coordinates
// from the active saved place, or the secured last-known device fix when none is
// selected. Centralising this keeps lat/lon inside hook closures (and out of
// JSX prop interfaces), per privacy audit PRIVACY-002 — components that need
// coords call this hook directly rather than receiving them as props.
//
// LOCATION IS OPT-IN: the device fix comes from the geo store, which never
// auto-prompts — it rehydrates the secured last-known fix and is refreshed only
// by the "Use location" button in Settings (useGeo.requestLocation).
export function useActiveCoords(): ActiveCoordsState {
  const geoLat = useGeo((s) => s.lat)
  const geoLon = useGeo((s) => s.lon)
  const geoLoading = useGeo((s) => s.loading)
  const { places, activePlaceId, loading: placesLoading } = usePlaces()
  const activePlace = places.find((p) => p.id === activePlaceId) || null

  const lat = activePlace ? activePlace.lat : geoLat
  const lon = activePlace ? activePlace.lon : geoLon
  const placeName = activePlace ? activePlace.name : 'Current Location'
  const placeRegion = activePlace ? activePlace.region : 'Geolocated'
  const loading = activePlace ? placesLoading : placesLoading || geoLoading

  return { lat, lon, placeName, placeRegion, loading }
}
