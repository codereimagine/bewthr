import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { LiveSky, type PlayClock } from './LiveSky'
import { WX_ACCENT_LIGHT, wxBucket, type WxBucket } from '../lib/weatherTheme'
import type { CurrentWeather, HourlyWeather } from '../lib/openMeteo'
import { useGeo } from '../store/geo'
import { usePlaces } from '../store/places'
import { useSettings } from '../store/settings'
import { getWindUnitLabel } from '../lib/weather'
import { usePwaUpdate } from '../lib/PwaUpdate'
import { AlertBanner } from './AlertBanner'
import type { NWSAlert } from '../lib/nws'
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

// Sky swatch per condition — a compressed look at the real sky, painted along the
// weather strip so the slider itself shows the day (dark night → blue day → dusk).
const SKY: Record<WxBucket, string> = {
  'clear-day': '#4f9fe6', 'clear-night': '#161f3c', partly: '#6f9fd0',
  cloud: '#6d7f99', fog: '#79879d', rain: '#4a5d7a', storm: '#3a3f63', snow: '#aec4dc',
}
// Mix two hex colours — used to darken day-coloured conditions when the hour is night.
const mixHex = (a: string, b: string, t: number) => {
  const ch = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const A = ch(a), B = ch(b)
  return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join('')
}

interface Hour {
  label: string; temp: number; b: WxBucket; rain: number; wind: number; cloud: number
  time: Date; current: CurrentWeather
}

// The strip colour for an hour: its sky swatch, darkened when that hour is at night
// (clear buckets already carry day/night, so only the shared ones need it).
const skyColorFor = (hr: Hour) =>
  (hr.b === 'clear-day' || hr.b === 'clear-night' || hr.current.is_day) ? SKY[hr.b] : mixHex(SKY[hr.b], '#141c34', 0.5)

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

export function ContinuumView({ hourly, placeName, alerts, onOpenPlaces, onOpenSettings }: {
  hourly: HourlyWeather
  placeName: string
  alerts: NWSAlert[]
  onOpenPlaces: () => void
  onOpenSettings: () => void
}) {
  // Locate + places, same behaviour as the normal header (one-tap gesture).
  const geoLoading = useGeo((s) => s.loading)
  const geoEnabled = useGeo((s) => s.enabled)
  const setGeoEnabled = useGeo((s) => s.setEnabled)
  const requestLocation = useGeo((s) => s.requestLocation)
  const clearActivePlace = usePlaces((s) => s.clearActive)
  // deselect any picked city too — a picked city otherwise always wins over GPS
  const locate = () => { clearActivePlace(); if (!geoEnabled) setGeoEnabled(true); else requestLocation() }
  const bannerVisible = usePwaUpdate().bannerVisible   // drop the header below the update banner when shown
  const windUnitLabel = ' ' + getWindUnitLabel(useSettings((s) => s.windUnit))  // honour the unit setting (was hard-coded mph)

  const hours = useMemo(() => buildHours(hourly), [hourly])
  const len = hours.length
  const [pos, setPos] = useState(0)          // continuous 0..len-1 — smooth marker/temp/sky
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [playSpec, setPlaySpec] = useState<PlayClock | null>(null)   // sky clock handed to LiveSky during Play
  const rafRef = useRef<number | null>(null)
  const dragRef = useRef(false)
  const bandRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const tempRef = useRef<HTMLSpanElement>(null)
  const posRef = useRef(0)
  const skyBucketRef = useRef(-1)             // 5-min sky bucket for scrub commits
  const hourRef = useRef(-1)                  // rounded hour for Play content commits
  const STEP_MS = 2500                        // playback: ms per hour (~60s for the full day)

  const stopPlay = () => { if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null } setPlaying(false); setPlaySpec(null) }
  useEffect(() => stopPlay, [])

  // Interpolate between hours so Play glides instead of stepping. Discrete content
  // (condition, cards, chips) tracks the rounded hour; the marker, temp and sky are continuous.
  const i = len ? Math.max(0, Math.min(Math.round(pos), len - 1)) : 0
  const f = len ? Math.max(0, Math.min(pos, len - 1)) : 0
  const flo = Math.floor(f), fhi = Math.min(Math.max(len - 1, 0), flo + 1), frac = f - flo
  const dispTemp = len ? Math.round(hours[flo].temp + (hours[fhi].temp - hours[flo].temp) * frac) : 0
  // Sky time interpolated, quantised to 5 min so LiveSky repaints only as the sun actually moves (not every frame).
  const skyMs = len ? Math.round((hours[flo].time.getTime() + (hours[fhi].time.getTime() - hours[flo].time.getTime()) * frac) / 3e5) * 3e5 : 0
  const skyTime = useMemo(() => new Date(skyMs), [skyMs])
  // Stable `current` for LiveSky — it only reads weather_code + is_day, so reuse the same
  // object across consecutive same-condition hours. That stops the canvas rAF loop tearing
  // down and rebuilding on every hour tick during Play; a new object only on a real change.
  // Deps are intentionally just the condition keys (not hours/i) so identity holds between
  // same-condition hours — recompute reads the current hour's object when the condition flips.
  const curBucket = len && hours[i] ? hours[i].b : ''
  const curIsDay = len && hours[i] ? hours[i].current.is_day : 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const liveCur = useMemo(() => (len && hours[i] ? hours[i].current : null), [curBucket, curIsDay])

  // The strip gradient + ticks depend only on the (stable) hours — memoize so the per-hour
  // setPos re-render during Play doesn't rebuild the 24-stop gradient string every tick.
  const stripGradient = useMemo(
    () => (len ? `linear-gradient(90deg, ${hours.map((x, n) => `${skyColorFor(x)} ${(len > 1 ? (n / (len - 1)) * 100 : 50).toFixed(1)}%`).join(', ')})` : ''),
    [hours, len],
  )
  const ticks = useMemo(
    () => (len ? [...new Set([0, Math.round(len / 4), Math.round(len / 2), Math.round((3 * len) / 4), len - 1])].filter((n) => n >= 0 && n < len) : []),
    [len],
  )

  if (!len || !hours[i]) return null
  const h = hours[i]
  const acc = WX_ACCENT_LIGHT[h.b]
  // Hour n sits at xPct(n) along the strip; the handle rides the same scale.
  const xPct = (p: number) => (len > 1 ? (p / (len - 1)) * 100 : 50)

  const tempAt = (p: number) => { const a = Math.floor(p), b = Math.min(len - 1, a + 1); return Math.round(hours[a].temp + (hours[b].temp - hours[a].temp) * (p - a)) }
  const skyMsAt = (p: number) => { const a = Math.floor(p), b = Math.min(len - 1, a + 1); return hours[a].time.getTime() + (hours[b].time.getTime() - hours[a].time.getTime()) * (p - a) }
  // High-frequency visuals (handle + temp) go straight to the DOM every frame; the
  // sky + discrete content re-render only when the 5-min sky bucket changes — so the
  // weather background glides in lock-step with the slider, no render storm, and
  // NOW/PLAY stay tappable.
  // High-frequency visuals (handle + temp) go straight to the DOM every frame.
  const applyDom = (p: number) => {
    posRef.current = p
    if (handleRef.current) handleRef.current.style.left = `${xPct(p).toFixed(2)}%`
    if (tempRef.current) tempRef.current.textContent = String(tempAt(p))
  }
  // Drag / scrub: no play clock, so the sky follows the finger via 5-min sky buckets —
  // a React commit only when the bucket changes (background glides, no render storm).
  const applyScrub = (p: number) => {
    applyDom(p)
    const bucket = Math.round(skyMsAt(p) / 3e5)
    if (bucket !== skyBucketRef.current) { skyBucketRef.current = bucket; setPos(p) }
  }
  // Play: LiveSky drives the sky from its own continuous clock, so React only refreshes the
  // discrete content (condition, cards, chips) when the rounded hour changes — ~every 2.5s.
  const applyPlay = (p: number) => {
    applyDom(p)
    const hr = Math.round(p)
    if (hr !== hourRef.current) { hourRef.current = hr; setPos(p) }
  }
  const jump = (n: number) => { stopPlay(); const q = Math.max(0, Math.min(n, len - 1)); skyBucketRef.current = Math.round(skyMsAt(q) / 3e5); hourRef.current = Math.round(q); setPos(q) }
  const play = () => {
    if (rafRef.current != null) { stopPlay(); setPos(posRef.current); return }   // PAUSE — freeze where it is
    const start = pos >= len - 1 ? 0 : pos
    const t0 = performance.now()
    posRef.current = start; hourRef.current = Math.round(start)
    // Continuous sky clock for LiveSky: sky-ms per wall-ms over the whole tour, so the sky
    // glides in exact lock-step with the handle (both advance from t0 at the same rate).
    const base = skyMsAt(start), endMs = skyMsAt(len - 1)
    const wall = (len - 1 - start) * STEP_MS
    const rate = wall > 0 ? (endMs - base) / wall : 3.6e6 / STEP_MS
    setPlaying(true); setPlaySpec({ base, rate, startPerf: t0, endMs }); setPos(start)
    const tick = (now: number) => {
      const p = Math.min(len - 1, start + (now - t0) / STEP_MS)
      applyPlay(p)
      if (p >= len - 1) { stopPlay(); setPos(len - 1); return }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // Drag-to-scrub — continuous, so the sky glides with your finger.
  const posFromX = (clientX: number) => {
    const r = bandRef.current?.getBoundingClientRect()
    if (!r) return i
    return Math.max(0, Math.min(len - 1, ((clientX - r.left) / r.width) * (len - 1)))
  }
  const onBandDown = (e: ReactPointerEvent<HTMLDivElement>) => { stopPlay(); dragRef.current = true; setDragging(true); bandRef.current?.setPointerCapture(e.pointerId); applyScrub(posFromX(e.clientX)) }
  const onBandMove = (e: ReactPointerEvent<HTMLDivElement>) => { if (dragRef.current) applyScrub(posFromX(e.clientX)) }
  const onBandUp = (e: ReactPointerEvent<HTMLDivElement>) => { dragRef.current = false; setDragging(false); setPos(posRef.current); try { bandRef.current?.releasePointerCapture(e.pointerId) } catch { /* noop */ } }
  const onStripKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); jump(Math.min(i + 1, len - 1)) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); jump(Math.max(i - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); jump(0) }
    else if (e.key === 'End') { e.preventDefault(); jump(len - 1) }
  }

  // NEXT chip — the next real change of condition group
  let next = `No change through ${hours[hours.length - 1].label}`
  for (let j = i + 1; j < hours.length; j++) {
    if (group(hours[j].b) !== group(h.b)) { next = `${GROUPNAME[group(hours[j].b)]} by ${hours[j].label}`; break }
  }

  return (
    <div className={`cont${playing ? ' cont--playing' : ''}${bannerVisible ? ' cont--banner' : ''}`} aria-label="Continuum — next 24 hours">
      <LiveSky current={liveCur} time={skyTime} alive play={playSpec} />
      <div className="cont-scrim cont-scrim--top" aria-hidden="true" />
      <div className="cont-scrim cont-scrim--bot" aria-hidden="true" />

      <header className="cont-header">
        <div className="cont-title mono" style={{ color: acc }}>CONTINUUM</div>
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
        <div className="mono cont-place">{placeName}</div>
      </div>

      <AlertBanner alerts={alerts} />

      <section className="cont-readout ease" aria-live="polite" style={{ textShadow: '0 2px 14px rgba(0,0,0,.45)' }}>
        <div className="cont-when mono ease" style={{ color: acc }}>{i === 0 ? `NOW · ${h.label}` : `${h.label} · +${i}H`}</div>
        <div className="cont-temp-row">
          <span className="cont-temp ease" ref={tempRef} style={{ color: acc }}>{dispTemp}</span>
          <span className="cont-deg ease" style={{ color: acc }}>°</span>
        </div>
        <div className="cont-cond">{NAME[h.b]}</div>
        <div className="cont-feel">{FEEL[h.b]}</div>
        <div className="glass cont-next"><span className="lbl">NEXT</span><span>{next}</span></div>
      </section>

      <div className="cont-metrics">
        {([['RAIN', h.rain, '%', h.rain], ['WIND', h.wind, windUnitLabel, Math.min(100, h.wind * 4)], ['CLOUD', h.cloud, '%', h.cloud]] as const).map(([label, val, unit, pct]) => (
          <div className="cont-metric" key={label}>
            <div className="cont-metric-head">
              <span className="lbl">{label}</span>
              <span className="cont-metric-v ease">{val}<span className="cont-unit">{unit}</span></span>
            </div>
            <div className="cont-metric-bar"><span className="ease" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: acc }} /></div>
          </div>
        ))}
      </div>

      <div className="cont-grow" />

      <section className="cont-scrubber" aria-label="Next 24 hours">
        <div className="cont-scrub-head">
          <span className="lbl">// NEXT 24 HOURS</span>
          <span className="lbl">{hours[0].label} → {hours[hours.length - 1].label}</span>
        </div>
        <div className="cont-strip" ref={bandRef} style={{ background: stripGradient }}
          onPointerDown={onBandDown} onPointerMove={onBandMove} onPointerUp={onBandUp} onPointerCancel={onBandUp}
          role="slider" tabIndex={0} aria-label="Scrub the next 24 hours"
          aria-valuemin={0} aria-valuemax={len - 1} aria-valuenow={i}
          aria-valuetext={`${i === 0 ? 'now' : h.label}, ${NAME[h.b]}, ${dispTemp} degrees`}
          onKeyDown={onStripKey}>
          <div className="cont-strip-handle" aria-hidden="true" ref={handleRef}
            style={{ left: `${xPct(f).toFixed(2)}%`, transition: (playing || dragging) ? 'none' : 'left .35s ease' }} />
        </div>
        <div className="cont-strip-ticks mono" aria-hidden="true">
          {ticks.map((n, k) => (
            <span key={n} style={{ left: `${xPct(n).toFixed(2)}%`, transform: k === 0 ? 'translateX(0)' : k === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{n === 0 ? 'NOW' : hours[n].label}</span>
          ))}
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
