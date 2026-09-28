import { useId } from 'react'
import type { SunInfo } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { formatSunTime } from '../lib/skyFormat'

interface SkySunArcProps {
  sun: SunInfo
  computedAt: Date
  timeFormat: TimeFormat
}

// The sun's daily path drawn as an arc: rise on the left, solar noon at the apex,
// set on the right. The sun disc rides the arc at its real position for right now,
// and the arc lights up gold for the part of the day already elapsed.
export function SkySunArc({ sun, computedAt, timeFormat }: SkySunArcProps) {
  const id = useId()
  const gid = `sunArc-${id}`
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)

  const W = 320
  const cx = 160
  const rx = 148
  const ry = 80
  const horizonY = 96

  let frac = 0.5
  if (sun.rise && sun.set) {
    const span = sun.set.getTime() - sun.rise.getTime()
    if (span > 0) frac = (computedAt.getTime() - sun.rise.getTime()) / span
  }
  const day = sun.isDay && frac >= 0 && frac <= 1
  const cf = Math.max(0, Math.min(1, frac))
  const sunX = 12 + cf * (W - 24)
  const norm = (sunX - cx) / rx
  const arcY = horizonY - ry * Math.sqrt(Math.max(0, 1 - norm * norm))
  const sunY = day ? arcY : horizonY + 12
  const noonX = cx
  const noonY = horizonY - ry

  return (
    <div className="sky-arc">
      <svg viewBox={`0 0 ${W} 118`} width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff9a4d" />
            <stop offset="50%" stopColor="#ffd479" />
            <stop offset="100%" stopColor="#ff9a4d" />
          </linearGradient>
        </defs>
        {/* horizon */}
        <line className="sky-arc-horizon" x1="6" y1={horizonY} x2={W - 6} y2={horizonY} />
        {/* full path (faint) */}
        <path className="sky-arc-track" pathLength={100} d={`M12,${horizonY} A${rx},${ry} 0 0,1 ${W - 12},${horizonY}`} fill="none" />
        {/* elapsed path (gold, up to now) */}
        {day && (
          <path
            className="sky-arc-progress"
            pathLength={100}
            strokeDasharray={`${cf * 100} 100`}
            stroke={`url(#${gid})`}
            d={`M12,${horizonY} A${rx},${ry} 0 0,1 ${W - 12},${horizonY}`}
            fill="none"
          />
        )}
        {/* noon marker */}
        <circle className="sky-arc-tick" cx={noonX} cy={noonY} r="2" />
        {/* the sun */}
        <circle className="sky-arc-sun-glow" cx={sunX} cy={sunY} r="11" opacity={day ? 1 : 0.4} />
        <circle className="sky-arc-sun" cx={sunX} cy={sunY} r="6.5" opacity={day ? 1 : 0.45} />
        {/* endpoint dots */}
        <circle className="sky-arc-tick" cx="12" cy={horizonY} r="2.4" />
        <circle className="sky-arc-tick" cx={W - 12} cy={horizonY} r="2.4" />
      </svg>
      <div className="sky-arc-labels">
        <div className="sky-arc-end">
          <div className="sky-arc-end-label">Rise</div>
          <div className="sky-arc-end-time">{fmt(sun.rise)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--mid">
          <div className="sky-arc-end-label">Noon</div>
          <div className="sky-arc-end-time">{fmt(sun.solarNoon)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--right">
          <div className="sky-arc-end-label">Set</div>
          <div className="sky-arc-end-time">{fmt(sun.set)}</div>
        </div>
      </div>
    </div>
  )
}
