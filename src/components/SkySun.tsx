import { useSettings } from '../store/settings'
import type { SunInfo } from '../lib/astronomy'
import { formatSunTime, formatTimeRange } from '../lib/skyFormat'

interface SkySunProps {
  sun: SunInfo
  isDay: boolean
}

export function SkySun({ sun, isDay }: SkySunProps) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  const range = (a: Date | null, b: Date | null) => formatTimeRange(a, b, timeFormat)

  return (
    <div className="sky-group">
      <div className="sky-group-title">Sun</div>
      <div className="sky-kv">
        <div className="sky-kv-row">
          <div className="sky-kv-label">Set</div>
          <div className="sky-kv-value">{fmt(sun.set)}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">{isDay ? 'Rise (next)' : 'Rise'}</div>
          <div className="sky-kv-value">{fmt(sun.rise)}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">Golden hour</div>
          <div className="sky-kv-value">{range(sun.goldenHourStart, sun.goldenHourEnd)}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">Blue hour</div>
          <div className="sky-kv-value">{range(sun.blueHourStart, sun.blueHourEnd)}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">Civil twilight</div>
          <div className="sky-kv-value">{fmt(sun.civilTwilightEnd)}</div>
        </div>
        {isDay ? (
          <div className="sky-kv-row">
            <div className="sky-kv-label">Solar noon</div>
            <div className="sky-kv-value">{fmt(sun.solarNoon)}</div>
          </div>
        ) : (
          <div className="sky-kv-row">
            <div className="sky-kv-label">Astro twilight</div>
            <div className="sky-kv-value">{fmt(sun.astroTwilightEnd)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
