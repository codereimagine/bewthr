import { usePlaces } from '../store/places'
import { useGeolocation } from './useGeolocation'

export interface ActiveCoordsState {
  lat: number | null
  lon: number | null
  placeName: string
  placeRegion: string
  loading: boolean
}

// Single source of truth for the user's active location. Returns coordinates
// from the active saved place, or falls back to live geolocation when none is
// selected. Centralising this keeps lat/lon inside hook closures (and out of
// JSX prop interfaces), per privacy audit PRIVACY-002 — components that need
// coords call this hook directly rather than receiving them as props.
export function useActiveCoords(): ActiveCoordsState {
  const geo = useGeolocation()
  const { places, activePlaceId, loading: placesLoading } = usePlaces()
  const activePlace = places.find((p) => p.id === activePlaceId) || null

  const lat = activePlace ? activePlace.lat : geo.lat
  const lon = activePlace ? activePlace.lon : geo.lon
  const placeName = activePlace ? activePlace.name : 'Current Location'
  const placeRegion = activePlace ? activePlace.region : 'Geolocated'
  const loading = activePlace ? placesLoading : placesLoading || geo.loading

  return { lat, lon, placeName, placeRegion, loading }
}
