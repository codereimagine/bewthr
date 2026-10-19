import type { CSSProperties } from 'react'
import { useSettings } from '../store/settings'
import { getWeatherIcon } from '../lib/weather'
import { wxAccentLight } from '../lib/weatherTheme'
import type { HourlyWeather } from '../lib/openMeteo'
import './HourlyStrip.css'

// timeZone = the place's IANA zone, so a picked city shows ITS hours.
function formatTime(iso: string, timeFormat: string, timeZone?: string): string {
  const d = new Date(iso)
  if (timeFormat === '24') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone })
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone }).replace(' ', '').toLowerCase()
}

interface HourlyStripProps {
  hourly: HourlyWeather
}

export function HourlyStrip({ hourly }: HourlyStripProps) {
  const showHourly = useSettings((s) => s.showHourly)
  const timeFormat = useSettings((s) => s.timeFormat)
  const accentMode = useSettings((s) => s.accentMode)

  if (!showHourly) return null

  // "Now" = the NEAREST hour — the same rule as Continuum, so both views agree.
  const nowMs = new Date().getTime()
  const startIdx = hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs - 30 * 60 * 1000)
  if (startIdx === -1) return null

  const hours = hourly.time.slice(startIdx, startIdx + 24)

  return (
    <div className="section fade-in">
      <div className="section-header">
        <div className="section-title">Next 24 Hours</div>
      </div>
      <div className="hourly-strip">
        {hours.map((_, i) => {
          const idx = startIdx + i
          return (
            <div
              key={idx}
              className={`hour-card ${i === 0 ? 'now' : ''}`}
              // Imagined only: each hour takes its own weather colour. Classic keeps
              // the base orange accent (no inline override) — PRIVACY of the look.
              style={accentMode === 'imagined'
                ? ({ '--accent': wxAccentLight(hourly.weather_code[idx], hourly.is_day[idx]) } as CSSProperties)
                : undefined}
            >
              <div className="hour-time">
                {i === 0 ? 'Now' : formatTime(hourly.time[idx], timeFormat, hourly.timeZone)}
              </div>
              <div className="hour-icon">
                {getWeatherIcon(hourly.weather_code[idx], hourly.is_day[idx])}
              </div>
              <div className="hour-temp">
                {Math.round(hourly.temperature_2m[idx])}{'\u00B0'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
