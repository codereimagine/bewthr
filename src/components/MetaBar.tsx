import { useState, useEffect } from 'react'
import { useSettings } from '../store/settings'
import './MetaBar.css'

interface MetaBarProps {
  /** A picked city (not your geolocated spot): the clock shows ITS local time,
   *  tagged with the city name and set apart by a divider. null = your time. */
  city?: string | null
  /** The city's IANA zone (from the forecast). Until it's known the clock shows
   *  --:-- rather than a wrong (device) time. */
  timeZone?: string
}

export function MetaBar({ city = null, timeZone }: MetaBarProps) {
  const timeFormat = useSettings((s) => s.timeFormat)
  const [cityTime, setCityTime] = useState('')
  const [localTime, setLocalTime] = useState('')

  useEffect(() => {
    function fmt(d: Date, zone?: string): string {
      const opts: Intl.DateTimeFormatOptions =
        timeFormat === '24'
          ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zone }
          : { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone }
      return d.toLocaleTimeString(timeFormat === '24' ? 'en-GB' : 'en-US', opts)
    }
    function update() {
      const d = new Date()
      setLocalTime(fmt(d))
      // a picked city's zone arrives with its forecast — never show a wrong time meanwhile
      setCityTime(city && timeZone ? fmt(d, timeZone) : '')
    }
    // Tick exactly on the minute (a fixed 30 s interval lagged the minute change by
    // up to 30 s), and refresh at once when the app comes back to the foreground —
    // phones pause timers in the background.
    let t: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      update()
      const now = new Date()
      t = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 20)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (t) clearTimeout(t)
      tick()
    }
    tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (t) clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [timeFormat, city, timeZone])

  return (
    <div className={`meta-bar${city ? ' meta-bar--city' : ''}`}>
      <div className="meta-status">
        <span className="status-dot" />
        <span className="meta-status-label">SYS.ONLINE</span>
      </div>
      {city ? (
        // CITY time │ HERE (your device) time — both clocks, clearly separated
        <div className="meta-time" aria-label={`${city} ${cityTime || 'loading'}, your time ${localTime}`}>
          <span className="meta-city">{city}</span>
          <span className="meta-clock">{cityTime || '--:--'}</span>
          <span className="meta-sep" aria-hidden="true" />
          <span className="meta-here">here</span>
          <span className="meta-clock meta-local">{localTime || '--:--'}</span>
        </div>
      ) : (
        <div className="meta-time">{localTime || '--:--'}</div>
      )}
    </div>
  )
}
