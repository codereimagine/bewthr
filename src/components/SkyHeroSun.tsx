import { useId } from 'react'
import type { SunInfo } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { formatCountdown, formatTimeRange } from '../lib/skyFormat'

interface SkyHeroSunProps {
  sun: SunInfo
  computedAt: Date
  timeFormat: TimeFormat
}

// 12 rays at 30° steps, alternating length for a livelier corona.
const RAYS = Array.from({ length: 12 }, (_, i) => {
  const ang = (i * 30 * Math.PI) / 180
  const inner = 42
  const outer = i % 2 === 0 ? 56 : 50
  return {
    x1: Math.cos(ang) * inner,
    y1: Math.sin(ang) * inner,
    x2: Math.cos(ang) * outer,
    y2: Math.sin(ang) * outer,
  }
})

export function SkyHeroSun({ sun, computedAt, timeFormat }: SkyHeroSunProps) {
  const id = useId()
  const gradId = `sunGrad-${id}`
  const coronaId = `sunCorona-${id}`

  return (
    <div className="sky-hero">
      <div className="sky-hero-visual">
        <svg viewBox="-60 -60 120 120" width="96" height="96" aria-hidden="true" className="sky-sun-svg">
          <defs>
            <radialGradient id={coronaId} cx="50%" cy="50%">
              <stop offset="28%" stopColor="rgba(255,190,90,0.38)" />
              <stop offset="68%" stopColor="rgba(255,150,60,0.12)" />
              <stop offset="100%" stopColor="rgba(255,150,60,0)" />
            </radialGradient>
            <radialGradient id={gradId} cx="38%" cy="34%">
              <stop offset="0%" stopColor="#fff6d8" />
              <stop offset="45%" stopColor="#ffd170" />
              <stop offset="78%" stopColor="#ffa63e" />
              <stop offset="100%" stopColor="#f5791d" />
            </radialGradient>
          </defs>
          {/* corona */}
          <circle r="58" fill={`url(#${coronaId})`} />
          {/* rays */}
          <g className="sky-sun-rays">
            {RAYS.map((r, i) => (
              <line key={i} className="sky-sun-ray" x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            ))}
          </g>
          {/* disc + limb highlight */}
          <circle r="34" fill={`url(#${gradId})`} />
          <circle r="34" fill="none" stroke="rgba(255,244,208,0.55)" strokeWidth="1" />
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
