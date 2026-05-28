import { useId } from 'react'
import type { SunInfo } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { formatCountdown, formatTimeRange } from '../lib/skyFormat'

interface SkyHeroSunProps {
  sun: SunInfo
  computedAt: Date
  timeFormat: TimeFormat
}

export function SkyHeroSun({ sun, computedAt, timeFormat }: SkyHeroSunProps) {
  const id = useId()
  const gradId = `sunGrad-${id}`

  return (
    <div className="sky-hero">
      <div className="sky-hero-visual">
        <svg viewBox="-60 -60 120 120" width="96" height="96" aria-hidden="true">
          <defs>
            <radialGradient id={gradId} cx="35%" cy="35%">
              <stop offset="0%" stopColor="#ffe8a0" />
              <stop offset="60%" stopColor="#ffaa44" />
              <stop offset="100%" stopColor="#ff7722" />
            </radialGradient>
          </defs>
          <circle r="58" fill="rgba(255, 170, 68, 0.18)" />
          <g stroke="#ffaa44" strokeWidth="2.5" strokeLinecap="round" opacity="0.75">
            <line x1="0" y1="-56" x2="0" y2="-44" />
            <line x1="40" y1="-40" x2="32" y2="-32" />
            <line x1="56" y1="0" x2="44" y2="0" />
            <line x1="40" y1="40" x2="32" y2="32" />
            <line x1="0" y1="56" x2="0" y2="44" />
            <line x1="-40" y1="40" x2="-32" y2="32" />
            <line x1="-56" y1="0" x2="-44" y2="0" />
            <line x1="-40" y1="-40" x2="-32" y2="-32" />
          </g>
          <circle r="38" fill={`url(#${gradId})`} />
        </svg>
      </div>
      <div className="sky-hero-caption">
        <div className="sky-hero-name">Sun</div>
        <div className="sky-hero-meta">Sets in {formatCountdown(sun.set, computedAt)}</div>
        <div className="sky-hero-meta-sub">
          Golden hour {formatTimeRange(sun.goldenHourStart, sun.goldenHourEnd, timeFormat)}
        </div>
      </div>
    </div>
  )
}
