import { useSettings } from '../store/settings'
import { getWeatherIcon } from '../lib/weather'
import type { HourlyWeather } from '../lib/openMeteo'
import './HourlyStrip.css'

function formatTime(iso: string, timeFormat: string): string {
  const d = new Date(iso)
  if (timeFormat === '24') {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase()
}

interface HourlyStripProps {
  hourly: HourlyWeather
}

export function HourlyStrip({ hourly }: HourlyStripProps) {
  const showHourly = useSettings((s) => s.showHourly)
  const timeFormat = useSettings((s) => s.timeFormat)

  if (!showHourly) return null

  const now = new Date()
  const startIdx = hourly.time.findIndex((t) => new Date(t) >= now)
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
            <div key={idx} className={`hour-card ${i === 0 ? 'now' : ''}`}>
              <div className="hour-time">
                {i === 0 ? 'Now' : formatTime(hourly.time[idx], timeFormat)}
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
