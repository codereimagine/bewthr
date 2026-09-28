import { create } from 'zustand'
import { fetchIpLocation } from '../lib/ipGeo'

// LOCATION — opt-in, never auto-asked. The last granted fix is secured in
// localStorage and rehydrated on load, so the app uses it without re-prompting.
// A user (re)acquires only via the "Use location" button in Settings, which
// calls requestLocation(). Precise coords stay on-device (egress rounding lives
// in geoPrivacy.ts). Pure helpers below are unit-tested; the store's request is
// the only side-effect (getCurrentPosition), kept thin on purpose.

const GEO_KEY = 'bewthr_geo_v1'
const GEO_ENABLED_KEY = 'bewthr_geo_enabled'

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

function clearStored(): void {
  try { localStorage.removeItem(GEO_KEY) } catch { /* ignore */ }
}

// The on/off preference — the security chokepoint. Persisted on-device only.
// Location is ON by default; turning it off wipes the stored fix and stops all
// location use (no coords acquired, none sent to any service).
function readEnabled(): boolean {
  try {
    const v = localStorage.getItem(GEO_ENABLED_KEY)
    return v === null ? true : v === '1'
  } catch {
    return true
  }
}

function writeEnabled(on: boolean): void {
  try { localStorage.setItem(GEO_ENABLED_KEY, on ? '1' : '0') } catch { /* ignore */ }
}

export interface GeoState {
  lat: number | null
  lon: number | null
  error: string | null
  loading: boolean
  /** true when the current fix came from the IP/network fallback (city-level, no
      GPS prompt), not precise device GPS. */
  approximate: boolean
  /** Whether location is enabled — the security chokepoint. ON by default. */
  enabled: boolean
  /** Rehydrate the secured last-known fix. Never prompts. */
  loadStored: () => void
  /** App-load entry point: if location is ON (the default), load last-known
      instantly then refresh to current. If it's been turned OFF, do nothing. */
  init: () => void
  /** Flip the security chokepoint. ON → acquire; OFF → wipe the on-device fix and
      stop all location use (no coords held or sent). Persisted on-device. */
  setEnabled: (on: boolean) => void
  /** (Re)acquire the device location. Prompts on first grant, silent after. */
  requestLocation: () => void
}

export const useGeo = create<GeoState>((set, get) => ({
  lat: null,
  lon: null,
  error: null,
  loading: false,
  approximate: false,
  enabled: readEnabled(),

  loadStored: () => {
    const fix = readStored()
    if (fix) set({ lat: fix.lat, lon: fix.lon, error: null })
  },

  init: () => {
    const enabled = readEnabled()
    set({ enabled })
    if (!enabled) return // turned off — the chokepoint: no location acquired or sent
    const fix = readStored()
    if (fix) set({ lat: fix.lat, lon: fix.lon, error: null }) // instant last-known
    // Only AUTO-acquire on load when permission is ALREADY granted. iOS Chrome/Safari
    // deny geolocation requests that aren't triggered by a user tap, so requesting on
    // page load poisons the permission — the first acquire must come from a gesture
    // (the Location button). This keeps "on by default" (last-known loads instantly,
    // granted users silently refresh) without breaking first-time acquisition.
    try {
      navigator.permissions?.query({ name: 'geolocation' as PermissionName })
        .then((p) => { if (p.state === 'granted') get().requestLocation() })
        .catch(() => { /* Permissions API unsupported — stay gesture-only */ })
    } catch { /* ignore */ }
  },

  setEnabled: (on: boolean) => {
    writeEnabled(on)
    set({ enabled: on })
    if (on) {
      get().requestLocation()
    } else {
      // Security OFF: wipe the on-device fix and clear it from memory so nothing
      // (not even a rounded coord) leaves the app.
      clearStored()
      set({ lat: null, lon: null, error: null, loading: false })
    }
  },

  requestLocation: () => {
    set({ loading: true, error: null })

    // Fallback: approximate location from the network (IP), permission-free. Used
    // when precise GPS is blocked/denied/unavailable — notably iOS browsers that
    // never show the geolocation prompt. City-level; still rounded on egress.
    const ipFallback = async () => {
      const ip = await fetchIpLocation()
      if (ip) {
        writeStored(ip)
        set({ lat: ip.lat, lon: ip.lon, error: null, loading: false, approximate: true })
      } else {
        set({ error: 'Location unavailable', loading: false })
      }
    }

    if (!HAS_GEOLOCATION) {
      void ipFallback()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix: GeoFix = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        writeStored(fix)
        set({ lat: fix.lat, lon: fix.lon, error: null, loading: false, approximate: false })
      },
      () => {
        // GPS failed (denied / unavailable / no prompt) → try the network fallback.
        void ipFallback()
      },
      { timeout: 8000 }
    )
  },
}))
