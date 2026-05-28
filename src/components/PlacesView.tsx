import { useState, useRef, useEffect, type FormEvent } from 'react'
import { usePlaces } from '../store/places'
import { searchPlaces, type GeocodingResult } from '../lib/geocode'
import './PlacesView.css'

interface PlacesViewProps {
  open: boolean
  onClose: () => void
}

// Full-screen Places view. Replaces the previous bottom-sheet modal
// for the search flow specifically. Settings continues to use Modal
// (no input, no keyboard, the modal pattern works fine there).
//
// Why full-screen instead of a modal:
//   The previous bottom-sheet pattern combined position:fixed body
//   scroll-lock with a focused <input> and tappable interactive
//   siblings all inside the same fixed subtree. On iOS Safari that
//   triad reliably ate the first tap on a search result, requiring
//   the user to manually dismiss the keyboard first. Five separate
//   web-level workarounds (div→button, sticky removal, onPointerDown
//   + preventDefault, body-lock removal, :hover @media query) all
//   failed on iPhone Safari and Chrome iOS. The full-screen view
//   sidesteps every trigger condition at once: no body lock, the
//   view IS the screen, and standard tap handling works on every
//   platform.
export function PlacesView({ open, onClose }: PlacesViewProps) {
  const { places, addPlace, removePlace } = usePlaces()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodingResult[]>([])
  const [searchError, setSearchError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Reset transient state every time the view opens, so a previous
  // search doesn't leak into the next open.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSearchError(false)
      return
    }
    // Small delay matches the fade-in transition; focusing too early
    // can fight the animation on slower Android devices.
    const t = setTimeout(() => inputRef.current?.focus(), 180)
    return () => clearTimeout(t)
  }, [open])

  // Escape to close on desktop. No-op on touch devices that won't
  // fire keydown.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  function handleSearch(value: string) {
    setQuery(value)
    setSearchError(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchPlaces(value)
        setResults(data)
      } catch {
        setSearchError(true)
        setResults([])
      }
    }, 300)
  }

  function handleAdd(result: GeocodingResult) {
    const place = {
      id: `${result.latitude}_${result.longitude}`,
      name: result.name,
      region: [result.admin1, result.country].filter(Boolean).join(' · '),
      lat: result.latitude,
      lon: result.longitude,
    }
    addPlace(place)
    onClose()
  }

  // Submitting via the keyboard's Search/Enter key dismisses the
  // on-screen keyboard so the user can browse results freely.
  // Search itself is debounced via onChange — this handler does not
  // re-trigger fetch.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    inputRef.current?.blur()
  }

  return (
    <div
      className={`places-view ${open ? 'open' : ''}`}
      aria-hidden={!open}
      role="dialog"
      aria-label="Add Location"
    >
      <div className="places-view-header">
        <button
          type="button"
          className="places-view-icon-btn"
          onClick={onClose}
          aria-label="Back"
        >
          {'←'}
        </button>
        <div className="places-view-title">Add Location</div>
        <button
          type="button"
          className="places-view-icon-btn"
          onClick={onClose}
          aria-label="Close"
        >
          {'×'}
        </button>
      </div>

      <form className="places-view-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className="places-view-input"
          placeholder="Search any city worldwide..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </form>

      <div className="places-view-results">
        {searchError && (
          <div className="places-view-empty places-view-empty-error">
            Search failed
          </div>
        )}

        {!searchError && query.length < 2 && (
          <div className="places-view-empty places-view-hint">
            Type 2 or more characters to search
          </div>
        )}

        {!searchError && query.length >= 2 && results.length === 0 && (
          <div className="places-view-empty">No results found</div>
        )}

        {results.map((r, i) => (
          <button
            key={i}
            type="button"
            className="places-view-result"
            onClick={() => handleAdd(r)}
          >
            <div className="places-view-result-name">{r.name}</div>
            <div className="places-view-result-region">
              {[r.admin1, r.country].filter(Boolean).join(' · ')}
            </div>
          </button>
        ))}
      </div>

      <div className="places-view-saved">
        <div className="places-view-section-title">Saved Locations</div>
        <div className="places-view-saved-list">
          {places.length === 0 ? (
            <div className="places-view-empty">No saved places</div>
          ) : (
            places.map((p) => (
              <div key={p.id} className="places-view-saved-row">
                <div>
                  <div className="places-view-saved-name">{p.name}</div>
                  <div className="places-view-saved-region">{p.region}</div>
                </div>
                <button
                  type="button"
                  className="places-view-delete"
                  onClick={() => removePlace(p.id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
