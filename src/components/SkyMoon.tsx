import { useSettings } from '../store/settings'
import type { MoonInfo } from '../lib/astronomy'
import { formatSunTime } from '../lib/skyFormat'

interface SkyMoonProps {
  moon: MoonInfo
  isDay: boolean
}

export function SkyMoon({ moon, isDay }: SkyMoonProps) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)
  const pct = Math.round(moon.illumination * 100)

  return (
    <div className="sky-group">
      <div className="sky-group-title">Moon</div>
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
