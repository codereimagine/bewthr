import { describe, expect, it } from 'vitest'
import { placeLocalToUtcIso } from './openMeteo'

describe('placeLocalToUtcIso — Open-Meteo hourly times are place-local with no zone', () => {
  it('turns place-local wall-clock times into true UTC instants', () => {
    // Tokyo is UTC+9 (32400 s): 07:00 local = 22:00Z the day before
    expect(placeLocalToUtcIso(['2026-10-20T07:00'], 32400)).toEqual(['2026-10-19T22:00:00.000Z'])
    // New York (EDT) is UTC-4 (-14400 s): 18:00 local = 22:00Z
    expect(placeLocalToUtcIso(['2026-10-19T18:00'], -14400)).toEqual(['2026-10-19T22:00:00.000Z'])
  })

  it('the same instant in two cities converts to the same UTC time', () => {
    const [tokyo] = placeLocalToUtcIso(['2026-10-20T07:00'], 32400)
    const [newYork] = placeLocalToUtcIso(['2026-10-19T18:00'], -14400)
    expect(tokyo).toBe(newYork)
  })

  it('leaves times that already carry a zone untouched (MET.no style)', () => {
    expect(placeLocalToUtcIso(['2026-10-19T22:00:00Z'], 32400)).toEqual(['2026-10-19T22:00:00.000Z'])
    expect(placeLocalToUtcIso(['2026-10-20T07:00:00+09:00'], 0)).toEqual(['2026-10-19T22:00:00.000Z'])
  })

  it('"now" picks the right hour for a far-away city regardless of the device zone', () => {
    // Tokyo hourly from 00:00 local; true now = 22:10Z on the 19th = 07:10 Tokyo
    const local = Array.from({ length: 24 }, (_, h) => `2026-10-20T${String(h).padStart(2, '0')}:00`)
    const utc = placeLocalToUtcIso(local, 32400)
    const nowMs = Date.parse('2026-10-19T22:10:00Z')
    const start = utc.findIndex((t) => new Date(t).getTime() >= nowMs - 30 * 60 * 1000)
    expect(local[start]).toBe('2026-10-20T07:00')   // Tokyo's 7 AM, not a New York-clock hour
  })
})
