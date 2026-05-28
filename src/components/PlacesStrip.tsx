import { usePlaces } from '../store/places'
import './PlacesStrip.css'

export function PlacesStrip() {
  const { places, activePlaceId, selectPlace } = usePlaces()

  if (places.length === 0) return null

  return (
    <div className="places-strip">
      {places.map((p) => (
        <div
          key={p.id}
          className={`place-pill ${p.id === activePlaceId ? 'active' : ''}`}
          onClick={() => selectPlace(p.id)}
        >
          {p.name}
        </div>
      ))}
    </div>
  )
}
