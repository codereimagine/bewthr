import { useEffect } from 'react'
import type { CurrentWeather } from '../../lib/openMeteo'
import { useAnimationMode, useOsReducedMotion } from '../../hooks/useAnimationMode'
import { useSettings, type LightningMode } from '../../store/settings'
import { StarField } from './StarField'
import { CloudDrift, type CloudVariant } from './CloudDrift'
import { RainEffect } from './RainEffect'
import { SnowEffect } from './SnowEffect'
import { LightningEffect } from './LightningEffect'
import './atmosphere.css'

interface AtmosphereProps {
  current: CurrentWeather | null | undefined
}

interface AtmosphereDecision {
  stars: boolean
  cloud: boolean
  rain: boolean
  snow: boolean
  lightning: boolean
  cloudVariant: CloudVariant
}

const CLEAR_CODES = new Set([0, 1])
const CLOUD_CODES = new Set([2, 3, 45, 48])
const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82])
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86])
const STORM_CODES = new Set([95, 96, 99])

function devOverride(): AtmosphereDecision | null {
  if (!import.meta.env.DEV) return null
  if (typeof window === 'undefined') return null
  const param = new URLSearchParams(window.location.search).get('atmo')
  if (!param) return null
  switch (param) {
    case 'stars': return { stars: true,  cloud: false, rain: false, snow: false, lightning: false, cloudVariant: 'warm' }
    case 'cloud': return { stars: false, cloud: true,  rain: false, snow: false, lightning: false, cloudVariant: 'warm' }
    case 'rain':  return { stars: false, cloud: true,  rain: true,  snow: false, lightning: false, cloudVariant: 'cool' }
    case 'snow':  return { stars: false, cloud: true,  rain: false, snow: true,  lightning: false, cloudVariant: 'cold' }
    case 'storm': return { stars: false, cloud: true,  rain: true,  snow: false, lightning: false, cloudVariant: 'cool' }
    // 'storm-lightning' bypasses the safety gate for visual review of the lightning effect itself.
    case 'storm-lightning': return { stars: false, cloud: true, rain: true, snow: false, lightning: true, cloudVariant: 'cool' }
    case 'all':   return { stars: true,  cloud: true,  rain: true,  snow: true,  lightning: true,  cloudVariant: 'warm' }
    default:      return null
  }
}

function decide(
  current: CurrentWeather | null | undefined,
  mode: 'off' | 'reduced' | 'on',
  lightningSetting: LightningMode,
  osReduceMotion: boolean
): AtmosphereDecision {
  const empty: AtmosphereDecision = {
    stars: false, cloud: false, rain: false, snow: false, lightning: false, cloudVariant: 'warm',
  }
  if (!current || mode === 'off') return empty

  const code = current.weather_code
  const isNight = current.is_day === 0

  if (mode === 'reduced') {
    return { ...empty, stars: isNight && CLEAR_CODES.has(code) }
  }

  const isStorm = STORM_CODES.has(code)
  const cloud =
    CLOUD_CODES.has(code) ||
    RAIN_CODES.has(code) ||
    SNOW_CODES.has(code) ||
    isStorm
  const rain = RAIN_CODES.has(code) || isStorm
  const snow = SNOW_CODES.has(code)
  const stars = isNight && CLEAR_CODES.has(code) && !cloud && !rain && !snow
  const cloudVariant: CloudVariant = snow ? 'cold' : rain ? 'cool' : 'warm'
  // Lightning is the one hazard-class effect: it ALSO respects OS
  // prefers-reduced-motion as a third safety layer (on top of: storm
  // condition + user opt-in via settings.lightning). Ambient effects
  // (cloud, rain, snow, stars) intentionally do NOT clamp on OS
  // reduce-motion — manual iOS testing showed that suppressed the
  // user's expected weather visualisation.
  const lightning = isStorm && lightningSetting === 'on' && !osReduceMotion

  return { stars, cloud, rain, snow, lightning, cloudVariant }
}

export function Atmosphere({ current }: AtmosphereProps) {
  const mode = useAnimationMode()
  const osReduceMotion = useOsReducedMotion()
  const lightningSetting = useSettings((s) => s.lightning)

  useEffect(() => {
    const sync = () => {
      document.body.dataset.tabHidden = document.hidden ? 'true' : 'false'
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      delete document.body.dataset.tabHidden
    }
  }, [])

  if (mode === 'off') return null

  const decision = devOverride() ?? decide(current, mode, lightningSetting, osReduceMotion)
  const anyOn =
    decision.stars || decision.cloud || decision.rain || decision.snow || decision.lightning
  if (!anyOn) return null

  return (
    <div
      className="atmosphere"
      data-mode={mode}
      data-stars={decision.stars}
      data-cloud={decision.cloud}
      data-rain={decision.rain}
      data-snow={decision.snow}
      data-lightning={decision.lightning}
      aria-hidden="true"
    >
      {/* layer order back → front: cloud, rain, snow, stars, lightning (frontmost) */}
      {decision.cloud && <CloudDrift variant={decision.cloudVariant} />}
      {decision.rain && <RainEffect />}
      {decision.snow && <SnowEffect />}
      {decision.stars && <StarField />}
      {decision.lightning && <LightningEffect />}
    </div>
  )
}
