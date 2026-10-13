import { useEffect, useMemo, useRef, useState } from 'react'
import { LiveSky } from './LiveSky'
import { WX_ACCENT_LIGHT, wxBucket, type WxBucket } from '../lib/weatherTheme'
import type { CurrentWeather, HourlyWeather } from '../lib/openMeteo'
import { useGeo } from '../store/geo'
import './continuum.css'

// CONTINUUM — the third bewthr mode. The full-bleed sky (real astronomy, via
// LiveSky with a time prop) plus a 24-hour scrubber: drag or Play and the sky,
// readout and cards move hour by hour. 24h only — no daily forecast, no Sky
// Tonight. Built to the approved mockup (2026-10-12); Imagined/Classic untouched.

const NAME: Record<WxBucket, string> = {
  'clear-day': 'Sunny', 'clear-night': 'Clear', partly: 'Partly cloudy',
  cloud: 'Overcast', fog: 'Foggy', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorms',
}
const FEEL: Record<WxBucket, string> = {
  'clear-day': 'Bright, dry and easy. Sunglasses weather.',
  'clear-night': 'Cool, calm and clear. Stars are out.',
  partly: 'Clouds starting to build overhead.',
  cloud: 'Low, heavy sky. The air feels damp.',
  fog: 'Low, heavy sky. The air feels damp.',
  rain: 'Steady rain on the roof. Bring a jacket.',
  snow: 'Quiet, cold and white. Wrap up warm.',
  storm: 'Thunder rolling through. Best to stay in.',
}
const GROUPNAME: Record<string, string> = {
  clear: 'Clearing', partly: 'Clouds', cloud: 'Overcast', rain: 'Rain', storm: 'Thunderstorms', snow: 'Snow', fog: 'Fog',
}
const group = (b: WxBucket) => (b === 'clear-day' || b === 'clear-night') ? 'clear' : (b === 'cloud' || b === 'fog') ? 'cloud' : b

interface Hour {
  label: string; temp: number; b: WxBucket; rain: number; wind: number; cloud: number
  time: Date; current: CurrentWeather
}

// Build the 24-hour window from the current hour forward, from real Open-Meteo
// hourly data. Device clock (not Open-Meteo's zone) decides "now", per the spec.
function buildHours(h: HourlyWeather): Hour[] {
  const nowMs = Date.now()
  let start = h.time.findIndex((t) => new Date(t).getTime() >= nowMs - 30 * 60 * 1000)
  if (start < 0) start = 0
  const out: Hour[] = []
  for (let i = 0; i < 24 && start + i < h.time.length; i++) {
    const n = start + i
    const code = h.weather_code[n] ?? 0
    const isDay = h.is_day[n] ?? 1
    const label = new Date(h.time[n]).toLocaleTimeString([], { hour: 'numeric' }).replace(/:00/, '').replace(/\s+/g, ' ').toUpperCase()
    out.push({
      label,
      temp: Math.round(h.temperature_2m[n] ?? 0),
      b: wxBucket(code, isDay),
      rain: Math.round(h.precipitation_probability[n] ?? 0),
      wind: Math.round(h.wind_speed_10m[n] ?? 0),
      cloud: Math.round(h.cloud_cover[n] ?? 0),
      time: new Date(h.time[n]),
      current: {
        temperature_2m: h.temperature_2m[n] ?? 0, relative_humidity_2m: 0,
        apparent_temperature: h.temperature_2m[n] ?? 0, is_day: isDay,
        precipitation: h.precipitation[n] ?? 0, weather_code: code,
        wind_speed_10m: h.wind_speed_10m[n] ?? 0, surface_pressure: 0,
      },
    })
  }
  return out
}

export function ContinuumView({ hourly, placeName, onOpenPlaces, onOpenSettings }: {
  hourly: HourlyWeather
  placeName: string
  onOpenPlaces: () => void
  onOpenSettings: () => void
}) {
  // Locate + places, same behaviour as the normal header (one-tap gesture).
  const geoLoading = useGeo((s) => s.loading)
  const geoEnabled = useGeo((s) => s.enabled)
  const setGeoEnabled = useGeo((s) => s.setEnabled)
  const requestLocation = useGeo((s) => s.requestLocation)
  const locate = () => { if (!geoEnabled) setGeoEnabled(true); else requestLocation() }

  const hours = useMemo(() => buildHours(hourly), [hourly])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const i = Math.min(idx, hours.length - 1)
  const h = hours[i]

  const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } setPlaying(false) }
  useEffect(() => stop, [])

  if (!h) return null
  const acc = WX_ACCENT_LIGHT[h.b]

  const jump = (n: number) => { stop(); setIdx(n) }
  const play = () => {
    if (timerRef.current) { stop(); return }
    setIdx((v) => (v >= hours.length - 1 ? 0 : v))
    setPlaying(true)
    timerRef.current = setInterval(() => {
      setIdx((v) => { if (v >= hours.length - 1) { stop(); return 0 } return v + 1 })
    }, 1850)
  }

  // NEXT chip — the next real change of condition group
  let next = `No change through ${hours[hours.length - 1].label}`
  for (let j = i + 1; j < hours.length; j++) {
    if (group(hours[j].b) !== group(h.b)) { next = `${GROUPNAME[group(hours[j].b)]} by ${hours[j].label}`; break }
  }

  const lo = Math.max(0, Math.min(hours.length - 7, i - 3))
  const windowChips = hours.slice(lo, lo + 7)

  return (
    <div className="cont" aria-label="Continuum — next 24 hours">
      <LiveSky current={h.current} time={h.time} />
      <div className="cont-scrim cont-scrim--top" aria-hidden="true" />
      <div className="cont-scrim cont-scrim--bot" aria-hidden="true" />

      <header className="cont-header">
        <div className="cont-brand">
          <div className="cont-brand-mark mono">B</div>
          <div className="cont-brand-text">be<span>wthr</span></div>
        </div>
        <div className="cont-header-right">
          <button type="button" className="cont-ibtn" aria-label="Use my location" title="Use my location" onClick={locate} disabled={geoLoading} aria-busy={geoLoading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
              <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>
          <button type="button" className="cont-ibtn" aria-label="Add a place" title="Add a place" onClick={onOpenPlaces}>+</button>
          <button type="button" className="cont-ibtn" aria-label="Settings" title="Settings" onClick={onOpenSettings}>⚙</button>
        </div>
      </header>
      <div className="cont-place-row">
        <div className="mono cont-pill ease" style={{ border: `1px solid ${acc}`, color: acc }}>CONTINUUM</div>
        <div className="mono cont-place">{placeName}</div>
      </div>

      <section className="cont-readout ease" aria-live="polite" style={{ textShadow: '0 2px 14px rgba(0,0,0,.45)' }}>
        <div className="cont-when mono ease" style={{ color: acc }}>{i === 0 ? `NOW · ${h.label}` : `${h.label} · +${i}H`}</div>
        <div className="cont-temp-row">
          <span className="cont-temp ease" style={{ color: acc }}>{h.temp}</span>
          <span className="cont-deg ease" style={{ color: acc }}>°</span>
        </div>
        <div className="cont-cond">{NAME[h.b]}</div>
        <div className="cont-feel">{FEEL[h.b]}</div>
        <div className="glass cont-next"><span className="lbl">NEXT</span><span>{next}</span></div>
      </section>

      <div className="cont-cards">
        <div className="glass cont-card"><div className="lbl">RAIN</div><div className="cont-cardv">{h.rain}<span className="cont-unit">%</span></div></div>
        <div className="glass cont-card"><div className="lbl">WIND</div><div className="cont-cardv">{h.wind}<span className="cont-unit"> mph</span></div></div>
        <div className="glass cont-card"><div className="lbl">CLOUD</div><div className="cont-cardv">{h.cloud}<span className="cont-unit">%</span></div></div>
      </div>

      <div className="cont-grow" />

      <section className="cont-scrubber" aria-label="Next 24 hours">
        <div className="cont-scrub-head">
          <span className="lbl">// NEXT 24 HOURS</span>
          <span className="lbl">{hours[0].label} → {hours[hours.length - 1].label}</span>
        </div>
        <div className="cont-band">
          {hours.map((x, n) => (
            <button key={n} type="button" aria-label={`${x.label}, ${NAME[x.b]}`}
              className="cont-seg" style={{ background: WX_ACCENT_LIGHT[x.b], opacity: n === i ? 1 : 0.55 }}
              onClick={() => jump(n)} />
          ))}
          <div className="cont-marker ease" aria-hidden="true" style={{ left: `${((i + 0.5) / hours.length * 100).toFixed(2)}%` }} />
        </div>
        <div className="cont-chips">
          {windowChips.map((x, k) => {
            const n = lo + k, sel = n === i, ca = WX_ACCENT_LIGHT[x.b]
            return (
              <button key={n} type="button" aria-label={`${x.label}, ${x.temp} degrees, ${NAME[x.b]}`}
                className={`cont-chip${sel ? ' cont-chip--sel' : ''}`}
                style={sel ? { borderColor: ca, background: 'rgba(255,255,255,.12)' } : undefined}
                onClick={() => jump(n)}>
                <span className="mono cont-chip-time" style={{ color: sel ? '#f5f7fb' : '#aab3c7' }}>{n === 0 ? 'NOW' : x.label.replace(' ', '')}</span>
                <span className="cont-chip-dot" style={{ background: ca }} />
                <span className="cont-chip-temp" style={{ color: ca }}>{x.temp}°</span>
              </button>
            )
          })}
        </div>
        <div className="cont-controls">
          <button type="button" className="cont-play mono" style={{ background: acc }}
            aria-label={playing ? 'Pause the 24 hour tour' : 'Play the 24 hour tour'} onClick={play}>
            {playing ? '❚❚ PAUSE' : '▶ PLAY 24H'}
          </button>
          <button type="button" className="cont-now mono" aria-label="Back to now" onClick={() => jump(0)}>NOW</button>
        </div>
      </section>
    </div>
  )
}
