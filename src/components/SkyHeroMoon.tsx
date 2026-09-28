import { useId } from 'react'
import type { MoonInfo, MoonPhaseName } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { formatSunTime } from '../lib/skyFormat'

interface SkyHeroMoonProps {
  moon: MoonInfo
  timeFormat: TimeFormat
}

// Shadow circle x-offset per phase (Northern Hemisphere convention).
// Two same-radius circles overlapping: lit moon at (0,0), dark shadow
// at (cx, 0). Where shadow overlaps moon disc, shadow visible.
// null = no shadow rendered (Full moon).
const PHASE_SHADOW_CX: Record<MoonPhaseName, number | null> = {
  New: 0,
  'Waxing Crescent': -20,
  'First Quarter': -48,
  'Waxing Gibbous': -65,
  Full: null,
  'Waning Gibbous': 65,
  'Last Quarter': 48,
  'Waning Crescent': 20,
}

function sentenceCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

export function SkyHeroMoon({ moon, timeFormat }: SkyHeroMoonProps) {
  const id = useId()
  const gradId = `moonGrad-${id}`
  const clipId = `moonClip-${id}`
  const haloId = `moonHalo-${id}`
  const limbId = `moonLimb-${id}`

  const cx = PHASE_SHADOW_CX[moon.phaseName]
  const pct = Math.round(moon.illumination * 100)
  const isFull = moon.phaseName === 'Full'

  return (
    <div className="sky-hero">
      <div className="sky-hero-visual">
        <svg
          viewBox="-52 -52 104 104"
          width="96"
          height="96"
          aria-hidden="true"
          className={isFull ? 'sky-moon-svg sky-moon-full' : 'sky-moon-svg'}
        >
          <defs>
            <radialGradient id={gradId} cx="38%" cy="34%">
              <stop offset="0%" stopColor={isFull ? '#fffaeb' : '#f6f1da'} />
              <stop offset="62%" stopColor={isFull ? '#e9e2c6' : '#cec7ab'} />
              <stop offset="100%" stopColor={isFull ? '#b7b092' : '#8f8974'} />
            </radialGradient>
            <radialGradient id={haloId} cx="50%" cy="50%">
              <stop offset="52%" stopColor="rgba(245,240,214,0.24)" />
              <stop offset="100%" stopColor="rgba(245,240,214,0)" />
            </radialGradient>
            <radialGradient id={limbId} cx="50%" cy="50%">
              <stop offset="68%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(24,20,10,0.5)" />
            </radialGradient>
            <clipPath id={clipId}>
              <circle r="48" />
            </clipPath>
          </defs>
          {/* soft moonglow */}
          <circle r="52" fill={`url(#${haloId})`} />
          {/* lit disc */}
          <circle r="48" fill={`url(#${gradId})`} />
          {/* lunar surface — maria + craters + limb darkening, clipped to the disc
              and painted UNDER the phase shadow so the dark side hides them */}
          <g clipPath={`url(#${clipId})`}>
            <g className="sky-moon-maria">
              <ellipse cx="-13" cy="-15" rx="15" ry="12" />
              <ellipse cx="7" cy="-22" rx="9" ry="7" />
              <ellipse cx="15" cy="3" rx="11" ry="14" />
              <ellipse cx="-7" cy="12" rx="9" ry="7" />
              <ellipse cx="-23" cy="-3" rx="6" ry="9" />
            </g>
            <circle cx="-20" cy="21" r="3.2" className="sky-moon-crater" />
            <circle cx="23" cy="-8" r="2.4" className="sky-moon-crater" />
            <circle cx="2" cy="26" r="2.1" className="sky-moon-crater" />
            <circle r="48" fill={`url(#${limbId})`} />
          </g>
          {/* phase shadow */}
          {cx !== null && (
            <circle cx={cx} r="48" fill="#08080d" clipPath={`url(#${clipId})`} />
          )}
        </svg>
      </div>
      <div className="sky-hero-caption">
        <div className="sky-hero-name">Moon</div>
        <div className="sky-hero-meta">
          {sentenceCase(moon.phaseName)} {'·'} {pct}%
        </div>
        <div className="sky-hero-meta-sub">
          Rises {formatSunTime(moon.rise, timeFormat)} {'·'} Sets {formatSunTime(moon.set, timeFormat)}
        </div>
      </div>
    </div>
  )
}
