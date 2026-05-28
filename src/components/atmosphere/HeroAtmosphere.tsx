import { useMemo, type CSSProperties } from 'react'
import type { CurrentWeather } from '../../lib/openMeteo'
import { useAnimationMode } from '../../hooks/useAnimationMode'
import { mulberry32 } from './prng'
import './hero-atmosphere.css'

// Hero-contained atmosphere — focal animation INSIDE the hero card.
// Coexists with the full-page <Atmosphere> which acts as a dimmer ambient
// backdrop. Lightning intentionally lives only on the full-page layer
// (photosensitivity scope decision per FUNC-004 triage).
//
// Particle counts and sizes tuned for ~360x300px hero card. Travel
// distances in keyframes use fixed pixel values that comfortably exceed
// expected hero height.

const CLEAR_CODES = new Set([0, 1])
const CLOUD_CODES = new Set([2, 3, 45, 48])
const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])
const STORM_CODES = new Set([95, 96, 99])

interface HeroAtmosphereProps {
  current: CurrentWeather | null | undefined
}

type CloudVariant = 'warm' | 'cool' | 'cold'

interface Cloud { id: number; top: string; dur: string; delay: string }
interface Drop { id: number; left: string; dur: string; delay: string }
interface Flake { id: number; left: string; dur: string; delay: string; swayDur: string; swayDelay: string }
interface Star { id: number; top: string; left: string; dur: string; delay: string; lg: boolean }

const SEED = 42

function buildClouds(): Cloud[] {
  const r = mulberry32(SEED)
  const out: Cloud[] = []
  for (let i = 0; i < 3; i++) {
    out.push({
      id: i,
      top: (5 + r() * 50).toFixed(0) + '%',
      dur: (28 + r() * 18).toFixed(2) + 's',
      delay: (-r() * 30).toFixed(2) + 's',
    })
  }
  return out
}

function buildRain(): Drop[] {
  const r = mulberry32(SEED + 1)
  const out: Drop[] = []
  for (let i = 0; i < 14; i++) {
    out.push({
      id: i,
      left: (r() * 100).toFixed(0) + '%',
      dur: (0.55 + r() * 0.35).toFixed(2) + 's',
      delay: (-r() * 1.5).toFixed(2) + 's',
    })
  }
  return out
}

function buildSnow(): Flake[] {
  const r = mulberry32(SEED + 2)
  const out: Flake[] = []
  for (let i = 0; i < 10; i++) {
    out.push({
      id: i,
      left: (r() * 100).toFixed(0) + '%',
      dur: (5 + r() * 4).toFixed(2) + 's',
      delay: (-r() * 6).toFixed(2) + 's',
      swayDur: (1.8 + r() * 1.2).toFixed(2) + 's',
      swayDelay: (-r() * 2).toFixed(2) + 's',
    })
  }
  return out
}

function buildStars(): Star[] {
  const r = mulberry32(SEED + 3)
  const out: Star[] = []
  for (let i = 0; i < 14; i++) {
    out.push({
      id: i,
      top: (3 + r() * 65).toFixed(0) + '%',
      left: (r() * 96).toFixed(0) + '%',
      dur: (2.2 + r() * 2).toFixed(2) + 's',
      delay: (-r() * 4).toFixed(2) + 's',
      lg: r() < 0.25,
    })
  }
  return out
}

export function HeroAtmosphere({ current }: HeroAtmosphereProps) {
  const mode = useAnimationMode()
  const clouds = useMemo(() => buildClouds(), [])
  const rain = useMemo(() => buildRain(), [])
  const snow = useMemo(() => buildSnow(), [])
  const stars = useMemo(() => buildStars(), [])

  if (!current || mode === 'off') return null

  const code = current.weather_code
  const isNight = current.is_day === 0
  const isStorm = STORM_CODES.has(code)
  const showCloud = CLOUD_CODES.has(code) || RAIN_CODES.has(code) || SNOW_CODES.has(code) || isStorm
  const showRain = RAIN_CODES.has(code) || isStorm
  const showSnow = SNOW_CODES.has(code)
  const showStars = isNight && CLEAR_CODES.has(code) && !showCloud && !showRain && !showSnow
  const cloudVariant: CloudVariant = showSnow ? 'cold' : showRain ? 'cool' : 'warm'

  if (mode === 'reduced') {
    if (!showStars) return null
    return (
      <div className="hero-atmosphere" data-mode="reduced" aria-hidden="true">
        {stars.map((s) => (
          <div
            key={s.id}
            className={`hero-star ${s.lg ? 'lg' : ''}`}
            style={{ '--top': s.top, '--left': s.left, '--dur': s.dur, '--delay': s.delay } as CSSProperties}
          />
        ))}
      </div>
    )
  }

  if (!showCloud && !showRain && !showSnow && !showStars) return null

  const variantClass =
    cloudVariant === 'cool' ? 'hero-cloud cool' : cloudVariant === 'cold' ? 'hero-cloud cold' : 'hero-cloud'

  return (
    <div
      className="hero-atmosphere"
      data-mode={mode}
      data-cloud={showCloud}
      data-rain={showRain}
      data-snow={showSnow}
      data-stars={showStars}
      aria-hidden="true"
    >
      {showCloud && clouds.map((c) => (
        <div
          key={`c${c.id}`}
          className={variantClass}
          style={{ '--top': c.top, '--dur': c.dur, '--delay': c.delay } as CSSProperties}
        />
      ))}
      {showRain && rain.map((d) => (
        <div
          key={`r${d.id}`}
          className="hero-raindrop"
          style={{ '--left': d.left, '--dur': d.dur, '--delay': d.delay } as CSSProperties}
        />
      ))}
      {showSnow && snow.map((f) => (
        <div
          key={`s${f.id}`}
          className="hero-snowflake-track"
          style={{ '--left': f.left, '--dur': f.dur, '--delay': f.delay } as CSSProperties}
        >
          <div
            className="hero-snowflake-sway"
            style={{ '--sway-dur': f.swayDur, '--sway-delay': f.swayDelay } as CSSProperties}
          >
            <div className="hero-snowflake" />
          </div>
        </div>
      ))}
      {showStars && stars.map((s) => (
        <div
          key={`star${s.id}`}
          className={`hero-star ${s.lg ? 'lg' : ''}`}
          style={{ '--top': s.top, '--left': s.left, '--dur': s.dur, '--delay': s.delay } as CSSProperties}
        />
      ))}
    </div>
  )
}
