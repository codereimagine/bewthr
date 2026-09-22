// Weather-driven accent. Maps a WMO weather_code (+ is_day) to a fixed enum
// bucket, and each bucket to an accent hex. The bucket is applied as a
// data-cond attribute (whitelist enum -> never a user/network string in the
// DOM), so index.css can override --accent/--accent-glow/--accent-soft.
// Clear-day keeps the signature orange; the rest follow the cyan x magenta x
// gold palette. See vault bewthr spec (WEATHER-COLOR).

export type WxBucket =
  | 'clear-day'
  | 'clear-night'
  | 'partly'
  | 'cloud'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm'

/** WMO weather_code (+ is_day) -> a fixed accent bucket. */
export function wxBucket(code: number, isDay: number | boolean = 1): WxBucket {
  const day = !(isDay === 0 || isDay === false)
  if (code === 0 || code === 1) return day ? 'clear-day' : 'clear-night'
  if (code === 2) return 'partly'
  if (code === 3) return 'cloud'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  return 'cloud'
}

/** Accent hex per bucket — clear-day = the signature orange. */
export const WX_ACCENT: Record<WxBucket, string> = {
  'clear-day': '#ff6600',
  'clear-night': '#22d3ee',
  partly: '#9db8e8',
  cloud: '#6d7cf5',
  fog: '#7f9fd6',
  rain: '#38bdf8',
  snow: '#58d0ee',
  storm: '#d926e3',
}

/** Convenience: code (+ is_day) -> accent hex, for per-element coloring. */
export function wxAccent(code: number, isDay: number | boolean = 1): string {
  return WX_ACCENT[wxBucket(code, isDay)]
}
