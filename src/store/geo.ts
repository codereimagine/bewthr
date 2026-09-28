import { create } from 'zustand'

// LOCATION — opt-in, never auto-asked. The last granted fix is secured in
// localStorage and rehydrated on load, so the app uses it without re-prompting.
// A user (re)acquires only via the "Use location" button in Settings, which
// calls requestLocation(). Precise coords stay on-device (egress rounding lives
// in geoPrivacy.ts). Pure helpers below are unit-tested; the store's request is
// the only side-effect (getCurrentPosition), kept thin on purpose.

const GEO_KEY = 'bewthr_geo_v1'

export interface GeoFix {
  lat: number
  lon: number
}

/** Validate a persisted/loaded fix: finite numbers within lat/lon range. */
export function parseStoredGeo(raw: unknown): GeoFix | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const { lat, lon } = r
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

export function serializeGeo(fix: GeoFix): string {
  return JSON.stringify({ lat: fix.lat, lon: fix.lon })
}

// Generic, code-based messages — never the browser-provided err.message, which
// can include partial location hints on some platforms.
export function geolocationErrorMessage(code: number): string {
  if (code === 1) return 'Location permission denied'
  if (code === 2) return 'Location unavailable'
  if (code === 3) return 'Location request timed out'
  return 'Location unavailable'
}

const HAS_GEOLOCATION =
  typeof navigator !== 'undefined' && typeof navigator.geolocation !== 'undefined'

function readStored(): GeoFix | null {
  try {
    return parseStoredGeo(JSON.parse(localStorage.getItem(GEO_KEY) || 'null'))
  } catch {
    return null
  }
}

function writeStored(fix: GeoFix): void {
  try {
    localStorage.setItem(GEO_KEY, serializeGeo(fix))
  } catch {
    /* private mode / blocked storage — fix still lives in memory this session */
  }
}

export interface GeoState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
  /** Rehydrate the secured last-known fix. Never prompts. Call once on app load. */
  loadStored: () => void
  /** Opt-in: (re)acquire the device location. The only thing that prompts. */
  requestLocation: () => void
}

export const useGeo = create<GeoState>((set) => ({
  lat: null,
  lon: null,
  error: null,
  loading: false,

  loadStored: () => {
    const fix = readStored()
    if (fix) set({ lat: fix.lat, lon: fix.lon, error: null })
  },

  requestLocation: () => {
    if (!HAS_GEOLOCATION) {
      set({ error: 'Geolocation not supported' })
      return
    }
    set({ loading: true, error: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix: GeoFix = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        writeStored(fix)
        set({ lat: fix.lat, lon: fix.lon, error: null, loading: false })
      },
      (err) => {
        set({ error: geolocationErrorMessage(err.code), loading: false })
      },
      { timeout: 10000 }
    )
  },
}))
