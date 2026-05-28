import { useSettings } from '../store/settings'
import { getWeatherIcon, getCondition } from '../lib/weather'
import type { WeatherResponse } from '../lib/openMeteo'
import { HeroAtmosphere } from './atmosphere/HeroAtmosphere'
import './WeatherHero.css'

function convertPressure(hPa: number, unit: string): string {
  if (unit === 'inHg') return (hPa * 0.02953).toFixed(2)
  return String(Math.round(hPa))
}

function getWindUnitLabel(unit: string): string {
  return { mph: 'mph', kmh: 'km/h', ms: 'm/s', kn: 'kn' }[unit] || ''
}

interface WeatherHeroProps {
  weather: WeatherResponse | null
  loading: boolean
  error: string | null
  coordsReady: boolean
  placeName: string
  placeRegion: string
  onOpenPlaces?: () => void
}

export function WeatherHero({
  weather,
  loading,
  error,
  coordsReady,
  placeName,
  placeRegion,
  onOpenPlaces,
}: WeatherHeroProps) {
  const tempUnit = useSettings((s) => s.tempUnit)
  const windUnit = useSettings((s) => s.windUnit)
  const pressureUnit = useSettings((s) => s.pressureUnit)
  const showMetrics = useSettings((s) => s.showMetrics)

  if (loading) {
    return (
      <div className="loading">
        <span className="spinner" />FETCHING DATA
      </div>
    )
  }

  if (!coordsReady && !weather) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">{'\uD83D\uDCE1'}</div>
        <div className="empty-title">No location set</div>
        <div className="empty-sub">Add a place to begin</div>
        <button className="action-btn" onClick={onOpenPlaces}>Add Location</button>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">{'\u26A0'}</div>
        <div className="empty-title">Connection failed</div>
        <div className="empty-sub">Check network and retry</div>
        <button className="action-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  const c = weather.current

  return (
    <>
      <div className="hero fade-in">
        <HeroAtmosphere current={c} />
        <div className="hero-corners" />
        <div className="hero-content">
          <div className="hero-place">{placeName}</div>
          <div className="hero-region">{placeRegion}</div>
          <div className="hero-icon">{getWeatherIcon(c.weather_code, c.is_day)}</div>
          <div className="hero-temp">
            {Math.round(c.temperature_2m)}
            <span className="unit">{'\u00B0'}{tempUnit}</span>
          </div>
          <div className="hero-condition">{getCondition(c.weather_code)}</div>
          <div className="hero-feels">
            FEELS LIKE {Math.round(c.apparent_temperature)}{'\u00B0'}{tempUnit}
          </div>
        </div>
      </div>

      {showMetrics && (
        <div className="metrics fade-in">
          <div className="metric">
            <div className="metric-label">Wind</div>
            <div className="metric-value">
              {Math.round(c.wind_speed_10m)}
              <span className="metric-unit"> {getWindUnitLabel(windUnit)}</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Humidity</div>
            <div className="metric-value">
              {c.relative_humidity_2m}
              <span className="metric-unit">%</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Pressure</div>
            <div className="metric-value">
              {convertPressure(c.surface_pressure, pressureUnit)}
              <span className="metric-unit"> {pressureUnit}</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Precip</div>
            <div className="metric-value">
              {c.precipitation || 0}
              <span className="metric-unit">mm</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
