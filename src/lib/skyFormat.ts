import type { TimeFormat } from '../store/settings'
import type { MoonPhaseName } from './astronomy'

const DASH = '–'

// timeZone: the place's IANA zone (weather.hourly.timeZone) — Sky Tonight reads
// the place's clock, like Continuum; the top bar shows both clocks. Omitted (the
// zone arrives with the forecast) = the device's zone.
export function formatSunTime(date: Date | null, format: TimeFormat, timeZone?: string): string {
  if (!date) return '—'
  if (format === '24') {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    })
  }
  return date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    })
    .replace(' ', '')
    .toLowerCase()
}

export function formatTimeRange(
  start: Date | null,
  end: Date | null,
  format: TimeFormat,
  timeZone?: string,
): string {
  const a = formatSunTime(start, format, timeZone)
  const b = formatSunTime(end, format, timeZone)
  return `${a} ${DASH} ${b}`
}

export function formatCountdown(target: Date | null, now: Date = new Date()): string {
  if (!target) return '—'
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'now'
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export function moonPhaseEmoji(name: MoonPhaseName): string {
  switch (name) {
    case 'New': return '\u{1F311}'
    case 'Waxing Crescent': return '\u{1F312}'
    case 'First Quarter': return '\u{1F313}'
    case 'Waxing Gibbous': return '\u{1F314}'
    case 'Full': return '\u{1F315}'
    case 'Waning Gibbous': return '\u{1F316}'
    case 'Last Quarter': return '\u{1F317}'
    case 'Waning Crescent': return '\u{1F318}'
  }
}

export function moonPhaseShort(name: MoonPhaseName): string {
  switch (name) {
    case 'New': return 'New'
    case 'Waxing Crescent': return 'Waxing cres'
    case 'First Quarter': return 'First qtr'
    case 'Waxing Gibbous': return 'Waxing gib'
    case 'Full': return 'Full'
    case 'Waning Gibbous': return 'Waning gib'
    case 'Last Quarter': return 'Last qtr'
    case 'Waning Crescent': return 'Waning cres'
  }
}
