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

  const cx = PHASE_SHADOW_CX[moon.phaseName]
  const pct = Math.round(moon.illumination * 100)
  const isFull = moon.phaseName === 'Full'

  return (
    <div className="sky-hero">
      <div className="sky-hero-visual">
        <svg viewBox="-50 -50 100 100" width="96" height="96" aria-hidden="true">
          <defs>
            <radialGradient id={gradId} cx="35%" cy="35%">
              <stop offset="0%" stopColor={isFull ? '#fffaeb' : '#f5f0d6'} />
              <stop offset="70%" stopColor={isFull ? '#e8e2c8' : '#c8c2a8'} />
              <stop offset="100%" stopColor={isFull ? '#9a9a82' : '#7a7a6a'} />
            </radialGradient>
            <clipPath id={clipId}>
              <circle r="48" />
            </clipPath>
          </defs>
          <circle r="50" fill={`rgba(245, 240, 214, ${isFull ? 0.2 : 0.1})`} />
          <circle r="48" fill={`url(#${gradId})`} />
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
