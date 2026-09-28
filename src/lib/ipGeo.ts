// NETWORK / IP FALLBACK — approximate, permission-free location for when the
// browser's GPS is blocked (a common iOS state where no prompt ever appears).
// Keyless, HTTPS, CORS-enabled (ipwho.is). City-level accuracy only. This trades a
// little privacy (the lookup sees your IP, as any request does) for a location that
// works without the geolocation prompt; it's only used when the user has opted in
// and precise GPS failed. Egress rounding for weather calls still applies downstream.

export interface IpFix {
  lat: number
  lon: number
}

function valid(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === 'number' && typeof lon === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
    !(lat === 0 && lon === 0)
  )
}

export async function fetchIpLocation(): Promise<IpFix | null> {
  try {
    const res = await fetch('https://ipwho.is/', { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const d = (await res.json()) as { latitude?: unknown; longitude?: unknown; success?: boolean }
    if (d.success === false) return null
    const lat = d.latitude
    const lon = d.longitude
    if (valid(lat, lon)) return { lat: lat as number, lon: lon as number }
    return null
  } catch {
    return null
  }
}
