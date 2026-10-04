import { useEffect, useId, useMemo, useState } from 'react'
import type { MoonInfo } from '../lib/astronomy'
import { moonAltitude, moonArcWindow } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { useActiveCoords } from '../hooks/useActiveCoords'
import { formatSunTime } from '../lib/skyFormat'

interface SkyMoonArcProps {
  moon: MoonInfo
  timeFormat: TimeFormat
}

const W = 320
const RX = 148
const RY = 80
const HORIZON_Y = 96
const MAX_ALT = 90
const SAMPLES = 48
const TICK_MS = 1000

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const fracToX = (frac: number) => 12 + clamp01(frac) * (W - 24)
const altToY = (alt: number) => HORIZON_Y - RY * clamp01(alt / MAX_ALT)

// The moon's path, drawn exactly like the sun arc: sampled from true lunar altitude
// across this moon-pass (rise -> transit -> set), with the moon disc riding it live.
export function SkyMoonArc({ moon, timeFormat }: SkyMoonArcProps) {
  const id = useId()
  const gid = `moonArc-${id}`
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  // Coords stay inside this hook closure — never passed as props (PRIVACY-002).
  const { lat, lon } = useActiveCoords()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(t)
  }, [])

  const hourBucket = Math.floor(now.getTime() / 3_600_000)
  const { riseMs, setMs, transitMs } = useMemo(() => {
    if (lat === null || lon === null) return { riseMs: null, setMs: null, transitMs: null }
    const w = moonArcWindow(lat, lon, now)
    return {
      riseMs: w.rise?.getTime() ?? null,
      setMs: w.set?.getTime() ?? null,
      transitMs: w.transit?.getTime() ?? null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, hourBucket])
  const span = riseMs !== null && setMs !== null ? setMs - riseMs : 0

  const trackD = useMemo(() => {
    if (riseMs === null || span <= 0 || lat === null || lon === null) return null
    let d = ''
    for (let i = 0; i <= SAMPLES; i++) {
      const frac = i / SAMPLES
      const alt = moonAltitude(lat, lon, new Date(riseMs + frac * span))
      d += (i === 0 ? 'M' : 'L') + fracToX(frac).toFixed(2) + ',' + altToY(alt).toFixed(2)
    }
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riseMs, span, lat, lon])

  const riseDate = riseMs !== null ? new Date(riseMs) : moon.rise
  const setDate = setMs !== null ? new Date(setMs) : moon.set

  const liveAlt = lat !== null && lon !== null ? moonAltitude(lat, lon, now) : -90
  const frac = span > 0 ? (now.getTime() - (riseMs as number)) / span : 0.5
  const up = liveAlt > 0
  const cf = clamp01(frac)
  const moonX = fracToX(frac)
  const moonY = altToY(liveAlt)

  // transit marker at the true apex (moon's highest altitude this pass)
  let peakX: number | null = null
  let peakY = altToY(MAX_ALT)
  if (transitMs !== null && riseMs !== null && span > 0 && lat !== null && lon !== null) {
    peakX = fracToX((transitMs - riseMs) / span)
    peakY = altToY(moonAltitude(lat, lon, new Date(transitMs)))
  }

  return (
    <div className="sky-arc sky-arc--moon">
      <svg viewBox={`0 0 ${W} 118`} width="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8aa0c8" />
            <stop offset="50%" stopColor="#d7e2f6" />
            <stop offset="100%" stopColor="#8aa0c8" />
          </linearGradient>
        </defs>
        <line className="sky-arc-horizon" x1="6" y1={HORIZON_Y} x2={W - 6} y2={HORIZON_Y} />
        {trackD ? (
          <>
            <path className="sky-arc-track" pathLength={100} d={trackD} fill="none" />
            {up && (
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
          <path
            className="sky-arc-track"
            d={`M12,${HORIZON_Y} A${RX},${RY} 0 0,1 ${W - 12},${HORIZON_Y}`}
            fill="none"
          />
        )}
        {peakX !== null && <circle className="sky-arc-tick" cx={peakX} cy={peakY} r="2" />}
        {/* the moon — only while above the horizon */}
        {up && (
          <>
            <circle className="sky-arc-moon-glow" cx={moonX} cy={moonY} r="11" />
            <circle className="sky-arc-moon" cx={moonX} cy={moonY} r="6.5" />
          </>
        )}
        <circle className="sky-arc-tick" cx="12" cy={HORIZON_Y} r="2.4" />
        <circle className="sky-arc-tick" cx={W - 12} cy={HORIZON_Y} r="2.4" />
      </svg>
      <div className="sky-arc-labels">
        <div className="sky-arc-end">
          <div className="sky-arc-end-label">Rise</div>
          <div className="sky-arc-end-time">{fmt(riseDate)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--mid">
          <div className="sky-arc-end-label">High</div>
          <div className="sky-arc-end-time">{fmt(transitMs !== null ? new Date(transitMs) : null)}</div>
        </div>
        <div className="sky-arc-end sky-arc-end--right">
          <div className="sky-arc-end-label">Set</div>
          <div className="sky-arc-end-time">{fmt(setDate)}</div>
        </div>
      </div>
    </div>
  )
}
