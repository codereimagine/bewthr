export type NWSSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'

const VALID_SEVERITIES: readonly NWSSeverity[] = [
  'Extreme',
  'Severe',
  'Moderate',
  'Minor',
  'Unknown',
] as const

function normalizeSeverity(raw: unknown): NWSSeverity {
  return typeof raw === 'string' && (VALID_SEVERITIES as readonly string[]).includes(raw)
    ? (raw as NWSSeverity)
    : 'Unknown'
}

export interface NWSAlert {
  id: string
  event: string
  severity: NWSSeverity
  headline: string
  description: string
  instruction: string | null
  expires: string
}

interface NWSFeature {
  id: string
  properties: {
    event: string
    severity: string
    headline: string
    description: string
    instruction: string | null
    expires: string
  }
}

interface NWSResponse {
  features: NWSFeature[]
}

// NWS only issues alerts for US territory. Points outside coverage return
// HTTP 400 — the network call is harmless but spams the console. Pre-filter
// with rough bounding boxes (intentionally generous: false positives just
// reproduce existing behavior, false negatives would silently drop alerts).
function isInUSCoverage(lat: number, lon: number): boolean {
  // CONUS (continental US)
  if (lat >= 24.5 && lat <= 49.5 && lon >= -125.0 && lon <= -66.5) return true
  // Alaska — longitude straddles the antimeridian (extends west past 180)
  if (lat >= 51.0 && lat <= 72.0 && (lon <= -130.0 || lon >= 172.0)) return true
  // Hawaii
  if (lat >= 18.5 && lat <= 22.5 && lon >= -161.0 && lon <= -154.0) return true
  // Puerto Rico, USVI
  if (lat >= 17.5 && lat <= 18.6 && lon >= -68.0 && lon <= -64.5) return true
  return false
}

export async function fetchAlerts(lat: number, lon: number): Promise<NWSAlert[]> {
  if (!isInUSCoverage(lat, lon)) return []

  const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'bewthr/1.0 (weather PWA)' },
  })

  if (!res.ok) return []

  const data: NWSResponse = await res.json()

  return data.features.map((f) => ({
    id: f.id,
    event: f.properties.event,
    severity: normalizeSeverity(f.properties.severity),
    headline: f.properties.headline,
    description: f.properties.description,
    instruction: f.properties.instruction,
    expires: f.properties.expires,
  }))
}