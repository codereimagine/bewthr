import { useId } from 'react'
import { useSettings } from '../store/settings'
import { getWeatherIcon } from '../lib/weather'
import type { DailyWeather } from '../lib/openMeteo'
import './DailyForecast.css'

function formatDay(iso: string, idx: number): string {
  if (idx === 0) return 'Today'
  // Open-Meteo daily.time entries are date-only ("YYYY-MM-DD"). Plain
  // `new Date(iso)` would parse those as UTC midnight, which lands on the
  // previous calendar day in any zone west of UTC and prints the wrong
  // weekday. Appending T00:00:00 forces local-midnight parsing.
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

interface DailyForecastProps {
  daily: DailyWeather
}

export function DailyForecast({ daily }: DailyForecastProps) {
  const showDaily = useSettings((s) => s.showDaily)
  const gradId = useId()

  if (!showDaily) return null

  const allTemps = [...daily.temperature_2m_min, ...daily.temperature_2m_max]
  const minT = Math.min(...allTemps)
  const maxT = Math.max(...allTemps)
  const range = maxT - minT || 1

  return (
    <div className="section fade-in">
      <div className="section-header">
        <div className="section-title">7-Day Forecast</div>
      </div>
      <svg className="day-bar-defs" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className="day-bar-stop-start" />
            <stop offset="1" className="day-bar-stop-end" />
          </linearGradient>
        </defs>
      </svg>
      <div className="daily-list">
        {daily.time.map((time, i) => {
          const dayMin = daily.temperature_2m_min[i]
          const dayMax = daily.temperature_2m_max[i]
          const startPct = ((dayMin - minT) / range) * 100
          const widthPct = Math.max(((dayMax - dayMin) / range) * 100, 4)

          return (
            <div key={time} className="day-row">
              <div className={`day-name ${i === 0 ? 'today' : ''}`}>
                {formatDay(time, i)}
              </div>
              <div className="day-icon">
                {getWeatherIcon(daily.weather_code[i])}
              </div>
              <div className="day-bar">
                <svg
                  className="day-bar-svg"
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <rect
                    x={startPct}
                    y="0"
                    width={widthPct}
                    height="4"
                    rx="2"
                    ry="2"
                    fill={`url(#${gradId})`}
                  />
                </svg>
              </div>
              <div className="day-temps">
                <span className="day-low">{Math.round(dayMin)}{'\u00B0'}</span>
                <span className="day-high">{Math.round(dayMax)}{'\u00B0'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
