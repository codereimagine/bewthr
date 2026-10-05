import { useSettings } from '../store/settings'
import type { SunInfo } from '../lib/astronomy'
import { formatSunTime, formatTimeRange } from '../lib/skyFormat'
import { SkyPathPanorama } from './SkyPathPanorama'
import { SkyDusk } from './SkyDusk'

interface SkySunProps {
  sun: SunInfo
  isDay: boolean
}

export function SkySun({ sun, isDay }: SkySunProps) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const imagined = useSettings((s) => s.accentMode) === 'imagined'
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  const range = (a: Date | null, b: Date | null) => formatTimeRange(a, b, timeFormat)

  const title = (
    <div className="sky-group-title">
      {imagined && (
        <svg className="sky-title-glyph sky-title-sun" viewBox="-12 -12 24 24" width="15" height="15" aria-hidden="true">
          <g className="sky-title-sun-rays">
            <line x1="0" y1="-11" x2="0" y2="-8" /><line x1="7.8" y1="-7.8" x2="5.7" y2="-5.7" />
            <line x1="11" y1="0" x2="8" y2="0" /><line x1="7.8" y1="7.8" x2="5.7" y2="5.7" />
            <line x1="0" y1="11" x2="0" y2="8" /><line x1="-7.8" y1="7.8" x2="-5.7" y2="5.7" />
            <line x1="-11" y1="0" x2="-8" y2="0" /><line x1="-7.8" y1="-7.8" x2="-5.7" y2="-5.7" />
          </g>
          <circle r="5.5" fill="#ffb03a" />
          <circle cx="-1.5" cy="-1.5" r="2.6" fill="#ffe6ad" />
        </svg>
      )}
      {imagined ? 'Sky' : 'Sun'}
    </div>
  )

  if (imagined) {
    return (
      <div className="sky-group">
        {title}
        <SkyPathPanorama />
        <SkyDusk sun={sun} timeFormat={timeFormat} />
      </div>
    )
  }

  return (
    <div className="sky-group">
      {title}
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
