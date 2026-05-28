import { useState, type KeyboardEvent } from 'react'
import { useSettings } from '../store/settings'
import { useSky } from '../hooks/useSky'
import { useActiveCoords } from '../hooks/useActiveCoords'
import { SkySun } from './SkySun'
import { SkyMoon } from './SkyMoon'
import { SkyPlanets } from './SkyPlanets'
import { SkyConstellations } from './SkyConstellations'
import { SkyHeroMoon } from './SkyHeroMoon'
import { SkyHeroSun } from './SkyHeroSun'
import {
  formatSunTime,
  formatCountdown,
  moonPhaseEmoji,
  moonPhaseShort,
} from '../lib/skyFormat'
import './SkySection.css'

export function SkySection() {
  const showSky = useSettings((s) => s.showSky)
  const timeFormat = useSettings((s) => s.timeFormat)
  const { lat, lon } = useActiveCoords()
  const sky = useSky(lat, lon)
  const [expanded, setExpanded] = useState(false)

  if (!showSky) return null
  if (!sky) return null

  const toggle = () => setExpanded((e) => !e)
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  const glyph = sky.isDay ? '☀️' : moonPhaseEmoji(sky.moon.phaseName)
  const setStr = formatSunTime(sky.sun.set, timeFormat)
  const moonShort = moonPhaseShort(sky.moon.phaseName)
  const moonPct = Math.round(sky.moon.illumination * 100)
  const planetCount = sky.planets.filter((p) => p.aboveHorizon).length

  return (
    <div className="section fade-in">
      <div className="section-header">
        <div className="section-title">Sky Tonight</div>
      </div>
      <div className={`sky-card ${expanded ? 'expanded' : ''}`}>
        <div
          className="sky-toggle"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={toggle}
          onKeyDown={onKey}
        >
          <div className="sky-toggle-left">
            <div className="sky-glyph">{glyph}</div>
            <div className={sky.isDay ? 'sky-summary sky-countdown' : 'sky-summary'}>
              {sky.isDay ? (
                <>
                  Golden hour in{' '}
                  <strong>{formatCountdown(sky.sun.goldenHourStart, sky.computedAt)}</strong>
                  {' · '}
                  Set {setStr}
                </>
              ) : (
                <>
                  <strong>Set {setStr}</strong>
                  {' · '}
                  {moonShort} {moonPct}%
                  {' · '}
                  <strong>{planetCount} {planetCount === 1 ? 'planet' : 'planets'}</strong>
                </>
              )}
            </div>
          </div>
          <div className="sky-chevron">{'▸'}</div>
        </div>
        {expanded && (
          <div className="sky-body">
            {sky.isDay ? (
              <SkyHeroSun sun={sky.sun} computedAt={sky.computedAt} timeFormat={timeFormat} />
            ) : (
              <SkyHeroMoon moon={sky.moon} timeFormat={timeFormat} />
            )}
            <SkySun sun={sky.sun} isDay={sky.isDay} />
            <SkyMoon moon={sky.moon} isDay={sky.isDay} />
            {sky.isDay ? (
              <div className="sky-group">
                <div className="sky-empty">
                  Planets &amp; constellations return after sunset
                </div>
              </div>
            ) : (
              <>
                <SkyPlanets planets={sky.planets} />
                <SkyConstellations constellations={sky.constellations} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
