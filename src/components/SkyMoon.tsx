import { useId } from 'react'
import { useSettings } from '../store/settings'
import type { MoonInfo } from '../lib/astronomy'
import { formatSunTime } from '../lib/skyFormat'
import { moonShadowPath } from '../lib/skyGlyphs'

interface SkyMoonProps {
  moon: MoonInfo
  isDay: boolean
}

export function SkyMoon({ moon, isDay }: SkyMoonProps) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const imagined = useSettings((s) => s.accentMode) === 'imagined'
  const id = useId()
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  const pct = Math.round(moon.illumination * 100)
  const waxing = moon.phaseAngle < 180
  const nearlyFull = moon.illumination > 0.99

  const title = (
    <div className="sky-group-title">
      {imagined && (
        <svg className="sky-title-glyph sky-title-moon" viewBox="-10 -10 20 20" width="15" height="15" aria-hidden="true">
          <circle r="8" fill="#e9e2c6" />
          {!nearlyFull && <path d={moonShadowPath(8, moon.illumination, waxing)} fill="#0b1020" />}
        </svg>
      )}
      Moon
    </div>
  )

  if (imagined) {
    return (
      <div className="sky-group">
        {title}
        <div className="sky-moon-card">
          <svg className="sky-moon-card-disc" viewBox="-50 -50 100 100" width="52" height="52" aria-hidden="true">
            <defs>
              <radialGradient id={`mc-g-${id}`} cx="38%" cy="34%">
                <stop offset="0%" stopColor="#fffaeb" />
                <stop offset="62%" stopColor="#e9e2c6" />
                <stop offset="100%" stopColor="#b7b092" />
              </radialGradient>
              <clipPath id={`mc-c-${id}`}><circle r="42" /></clipPath>
            </defs>
            <circle r="46" fill="rgba(233,226,198,0.14)" />
            <circle r="42" fill={`url(#mc-g-${id})`} />
            {!nearlyFull && (
              <path d={moonShadowPath(42, moon.illumination, waxing)} fill="#0b1020" clipPath={`url(#mc-c-${id})`} />
            )}
          </svg>
          <div className="sky-moon-card-body">
            <div className="sky-moon-card-name">{moon.phaseName}</div>
            <div className="sky-moon-illum">
              <div className="sky-moon-illum-bar"><span style={{ width: `${pct}%` }} /></div>
              <span className="sky-moon-illum-pct">{pct}% lit</span>
            </div>
            <div className="sky-moon-card-times">
              <span>{isDay ? 'Rises' : 'Rise'} {fmt(moon.rise)}</span>
              <span className="sky-dot">·</span>
              <span>{isDay ? 'Sets' : 'Set'} {fmt(moon.set)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sky-group">
      {title}
      <div className="sky-kv">
        <div className="sky-kv-row">
          <div className="sky-kv-label">Phase</div>
          <div className="sky-kv-value">{moon.phaseName}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">Illumination</div>
          <div className="sky-kv-value">{pct}%</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">{isDay ? 'Rises tonight' : 'Rise'}</div>
          <div className="sky-kv-value">{fmt(moon.rise)}</div>
        </div>
        <div className="sky-kv-row">
          <div className="sky-kv-label">{isDay ? 'Sets' : 'Set'}</div>
          <div className="sky-kv-value">{fmt(moon.set)}</div>
        </div>
      </div>
    </div>
  )
}
