import { create } from 'zustand'
import { get, set, del } from 'idb-keyval'

// TODO: Phase 2 deferred — swipe gestures between places, drag-to-reorder saved places

export interface Place {
  id: string
  name: string
  region: string
  lat: number
  lon: number
}

const PLACES_KEY = 'bewthr_places_v1'
const ACTIVE_KEY = 'bewthr_active_v1'

interface PlacesState {
  places: Place[]
  activePlaceId: string | null
  loading: boolean
  loadPlaces: () => Promise<void>
  addPlace: (place: Place) => void
  removePlace: (id: string) => void
  selectPlace: (id: string) => void
}

export const usePlaces = create<PlacesState>()((setState, getState) => ({
  places: [],
  activePlaceId: null,
  loading: true,

  loadPlaces: async () => {
    const [places, activeId] = await Promise.all([
      get<Place[]>(PLACES_KEY),
      get<string>(ACTIVE_KEY),
    ])
    setState({
      places: places || [],
      activePlaceId: activeId || null,
      loading: false,
    })
  },

  addPlace: (place) => {
    const { places } = getState()
    if (places.find((p) => p.id === place.id)) {
      setState({ activePlaceId: place.id })
      set(ACTIVE_KEY, place.id)
      return
    }
    const updated = [...places, place]
    setState({ places: updated, activePlaceId: place.id })
    set(PLACES_KEY, updated)
    set(ACTIVE_KEY, place.id)
  },

  removePlace: (id) => {
    const { places, activePlaceId } = getState()
    const updated = places.filter((p) => p.id !== id)
    const newActive =
      activePlaceId === id ? updated[0]?.id || null : activePlaceId
    setState({ places: updated, activePlaceId: newActive })
    set(PLACES_KEY, updated)
    if (newActive) {
      set(ACTIVE_KEY, newActive)
    } else {
      del(ACTIVE_KEY)
    }
  },

  selectPlace: (id) => {
    setState({ activePlaceId: id })
    set(ACTIVE_KEY, id)
  },
}))
