import { useEffect, useId, useMemo, useState } from 'react'
import type { SunInfo } from '../lib/astronomy'
import { sunAltitude, sunArcWindow } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { useActiveCoords } from '../hooks/useActiveCoords'
import { formatSunTime } from '../lib/skyFormat'

interface SkySunArcProps {
  sun: SunInfo
  timeFormat: TimeFormat
}

const W = 320
const RX = 148
const RY = 80
const HORIZON_Y = 96
const MAX_ALT = 90 // full arc height = sun straight overhead; so a low winter sun rides a flatter arc
const SAMPLES = 48
const TICK_MS = 1000 // live clock — the sun really is slow, so a 1s tick is "alive" without wasted frames

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
// time fraction of the day (0 = rise, 1 = set) -> x across the drawable width
const fracToX = (frac: number) => 12 + clamp01(frac) * (W - 24)
// real altitude (deg) -> y; 0 sits on the horizon, MAX_ALT at the apex
const altToY = (alt: number) => HORIZON_Y - RY * clamp01(alt / MAX_ALT)

// The sun's real daily path: the arc is sampled from true solar altitude across the
// day (so its height is physically accurate — flatter in winter), and the sun disc
// rides it at its live position for right now. The elapsed part lights up gold.
export function SkySunArc({ sun, timeFormat }: SkySunArcProps) {
  const id = useId()
  const gid = `sunArc-${id}`
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  // Coords stay inside this hook closure — never passed through JSX props (PRIVACY-002).
  const { lat, lon } = useActiveCoords()

  // live clock
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(t)
  }, [])

  // Today's daylight window (rise < set, bracketing now), recomputed at most hourly.
  const hourBucket = Math.floor(now.getTime() / 3_600_000)
  const { riseMs, setMs } = useMemo(() => {
    if (lat === null || lon === null) return { riseMs: null, setMs: null }
    const w = sunArcWindow(lat, lon, now)
    return { riseMs: w.rise?.getTime() ?? null, setMs: w.set?.getTime() ?? null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, hourBucket])
  const span = riseMs !== null && setMs !== null ? setMs - riseMs : 0

  // The real sun-path track, sampled from true altitude across [rise, set].
  const trackD = useMemo(() => {
    if (riseMs === null || span <= 0 || lat === null || lon === null) return null
    let d = ''
    for (let i = 0; i <= SAMPLES; i++) {
      const frac = i / SAMPLES
      const alt = sunAltitude(lat, lon, new Date(riseMs + frac * span))
      const x = fracToX(frac)
      const y = altToY(alt)
      d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2)
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riseMs, span, lat, lon])

  const riseDate = riseMs !== null ? new Date(riseMs) : sun.rise
  const setDate = setMs !== null ? new Date(setMs) : sun.set

  // live sun position (true altitude now)
  const liveAlt = lat !== null && lon !== null ? sunAltitude(lat, lon, now) : -90
  const frac = span > 0 ? (now.getTime() - (riseMs as number)) / span : 0.5
  const day = liveAlt > 0
  const cf = clamp01(frac)
  const sunX = fracToX(frac)
  const sunY = day ? altToY(liveAlt) : HORIZON_Y + 12

  // noon marker at the true apex (solar-noon altitude)
  let noonX: number | null = null
  let noonY = altToY(MAX_ALT)
  if (sun.solarNoon && riseMs !== null && span > 0 && lat !== null && lon !== null) {
    noonX = fracToX((sun.solarNoon.getTime() - riseMs) / span)
    noonY = altToY(sunAltitude(lat, lon, sun.solarNoon))
  }

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
        <line className="sky-arc-horizon" x1="6" y1={HORIZON_Y} x2={W - 6} y2={HORIZON_Y} />
        {trackD ? (
          <>
            {/* full real path (faint) */}
            <path className="sky-arc-track" pathLength={100} d={trackD} fill="none" />
            {/* elapsed path (gold, up to now) */}
            {day && (
              <path
                className="sky-arc-progress"
                pathLength={100}
                strokeDasharray={`${cf * 100} 100`}
                stroke={`url(#${gid})`}
                d={trackD}
                fill="none"
              />
            )}
          </>
        ) : (
          // polar day/night fallback — no rise/set today; keep a faint reference arc
          <path
            className="sky-arc-track"
            d={`M12,${HORIZON_Y} A${RX},${RY} 0 0,1 ${W - 12},${HORIZON_Y}`}
            fill="none"
          />
        )}
        {/* noon marker */}
        {noonX !== null && <circle className="sky-arc-tick" cx={noonX} cy={noonY} r="2" />}
        {/* the sun */}
        <circle className="sky-arc-sun-glow" cx={sunX} cy={sunY} r="11" opacity={day ? 1 : 0.4} />
        <circle className="sky-arc-sun" cx={sunX} cy={sunY} r="6.5" opacity={day ? 1 : 0.45} />
        {/* endpoint dots */}
        <circle className="sky-arc-tick" cx="12" cy={HORIZON_Y} r="2.4" />
        <circle className="sky-arc-tick" cx={W - 12} cy={HORIZON_Y} r="2.4" />
      </svg>
      <div className="sky-arc-labels">
        <div className="sky-arc-end">
          <div className="sky-arc-end-label">Rise</div>
          <div className="sky-arc-end-time">{fmt(riseDate)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--mid">
          <div className="sky-arc-end-label">Noon</div>
          <div className="sky-arc-end-time">{fmt(sun.solarNoon)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--right">
          <div className="sky-arc-end-label">Set</div>
          <div className="sky-arc-end-time">{fmt(setDate)}</div>
        </div>
      </div>
    </div>
  )
}
