import type { SunInfo } from '../lib/astronomy'
import type { TimeFormat } from '../store/settings'
import { formatSunTime } from '../lib/skyFormat'

// SKY DUSK — the golden/blue/civil/astro twilight sequence as a dusk gradient timeline
// (gold → blue → navy), markers placed at their real times, instead of a text table.
// Matches the panorama's dusk feel. Falls back to nothing if the window is unavailable.
interface SkyDuskProps {
  sun: SunInfo
  timeFormat: TimeFormat
}

export function SkyDusk({ sun, timeFormat }: SkyDuskProps) {
  const start = sun.goldenHourStart
  const end = sun.astroTwilightEnd
  if (!start || !end || end.getTime() <= start.getTime()) return null
  const span = end.getTime() - start.getTime()
  const pos = (d: Date | null) =>
    d ? Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / span) * 100)) : null
  const fmt = (d: Date | null) => formatSunTime(d, timeFormat)

  const marks: { label: string; t: Date | null; time: boolean }[] = [
    { label: 'Golden', t: sun.goldenHourStart, time: true },
    { label: 'Blue', t: sun.blueHourStart, time: true },
    { label: 'Civil', t: sun.civilTwilightEnd, time: false },
    { label: 'Astro', t: sun.astroTwilightEnd, time: true },
  ]

  return (
    <div className="sky-dusk" role="img" aria-label={`Dusk: golden hour ${fmt(sun.goldenHourStart)}, blue hour ${fmt(sun.blueHourStart)}, civil twilight ${fmt(sun.civilTwilightEnd)}, astronomical twilight ${fmt(sun.astroTwilightEnd)}`}>
      <div className="sky-dusk-track">
        <div className="sky-dusk-bar" />
        {marks.map((m) => {
          const p = pos(m.t)
          if (p === null) return null
          return (
            <div key={m.label} className="sky-dusk-mk" style={{ left: `${p}%` }}>
              {m.time && <span className="sky-dusk-time">{fmt(m.t)}</span>}
              <span className="sky-dusk-tick" />
              <span className="sky-dusk-label">{m.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
