import { useEffect, useRef } from 'react'
import { useActiveCoords } from '../hooks/useActiveCoords'
import { getSun, getMoon } from '../lib/astronomy'
import { wxBucket, type WxBucket } from '../lib/weatherTheme'
import type { CurrentWeather } from '../lib/openMeteo'
import './live-sky.css'

// LIVE SKY — the Imagined "living window": a full-bleed canvas behind the
// instrument chrome that IS the real sky for this place + time. Sky colour is
// computed from the true sun altitude (day/dusk/night); the moon rides at its
// real position + phase; stars appear only in real night. Condition (from the
// live weather) drives cloud + precipitation. Accurate first — it can never
// contradict the weather or the clock.
//
// GATED TO IMAGINED: App renders this only when accentMode === 'imagined', so
// Classic is byte-for-byte untouched. Coords come from useActiveCoords (they
// stay inside the hook, per PRIVACY-002 — never props).
//
// SMOOTHNESS is the signature: one rAF loop paced to the display refresh
// (1–120fps), a fixed drop count on reduced-motion. DPR-capped at 2.

interface LiveSkyProps {
  current: CurrentWeather | null | undefined
}

interface Fix {
  sunAlt: number
  sunAz: number
  moonAlt: number
  moonAz: number
  moonPhase: number
  moonFrac: number
}

const FACE = 180 // face south; sun/moon transit the southern sky (N hemisphere)
const FOV = 170

function hex(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function mix(a: string, b: string, t: number): string {
  const A = hex(a), B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}
// sun altitude (deg) -> [top, bottom] sky colour. Deep + saturated, never washed.
const SKY: [number, string, string][] = [
  [70, '#0f3b8a', '#3f86c9'], [20, '#123f86', '#5f9fcf'], [6, '#1a3f79', '#e0a15c'],
  [0, '#152f5f', '#d9743a'], [-6, '#0e2148', '#6b3f52'], [-12, '#0a1734', '#22203c'],
  [-30, '#05091a', '#0a1020'],
]
function skyStops(sunAlt: number): [string, string] {
  const s = Math.max(-30, Math.min(70, sunAlt))
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a1, t1, b1] = SKY[i], [a2, t2, b2] = SKY[i + 1]
    if (s <= a1 && s >= a2) {
      const f = (a1 - s) / (a1 - a2)
      return [mix(t1, t2, f), mix(b1, b2, f)]
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]]
}

function project(az: number, alt: number, W: number, H: number) {
  let d = ((az - FACE + 540) % 360) - 180
  return { x: W / 2 + (d / (FOV / 2)) * (W / 2), y: H - (alt / 90) * H, vis: Math.abs(d) < FOV / 2 }
}

export function LiveSky({ current }: LiveSkyProps) {
  const { lat, lon } = useActiveCoords()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fixRef = useRef<Fix | null>(null)

  // Recompute the celestial fix when coords change (and hourly via the tick below).
  useEffect(() => {
    if (lat == null || lon == null) { fixRef.current = null; return }
    const now = new Date()
    const sun = getSun(lat, lon, now)
    const moon = getMoon(lat, lon, now)
    fixRef.current = {
      sunAlt: sun.altitude, sunAz: sun.azimuth,
      moonAlt: moon.altitude, moonAz: moon.azimuth,
      moonPhase: moon.phaseAngle, moonFrac: moon.illumination,
    }
  }, [lat, lon])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const bucket: WxBucket = current ? wxBucket(current.weather_code, current.is_day) : 'clear-night'
    const cloudy = bucket === 'cloud' || bucket === 'fog'
    const rainy = bucket === 'rain' || bucket === 'storm'
    const snowy = bucket === 'snow'

    let W = 0, H = 0, DPR = 1
    let drops: { x: number; y: number; l: number; s: number }[] = []
    function resize() {
      DPR = Math.min(devicePixelRatio || 1, 2)
      const r = canvas!.getBoundingClientRect()
      W = canvas!.width = Math.max(1, Math.round(r.width * DPR))
      H = canvas!.height = Math.max(1, Math.round(r.height * DPR))
      const n = rainy ? 220 : snowy ? 140 : 0
      drops = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        l: snowy ? 2.5 * DPR : (10 + Math.random() * 18) * DPR,
        s: snowy ? 1 + Math.random() * 1.5 : 7 + Math.random() * 9,
      }))
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    let raf = 0
    let flash = 0
    let lastBolt = 0
    const t0 = performance.now()

    function draw(now: number) {
      const fix = fixRef.current
      const sunAlt = fix ? fix.sunAlt : -30
      ctx!.clearRect(0, 0, W, H)

      // sky gradient from the real sun altitude (storm darkens + desaturates)
      let [top, bot] = skyStops(sunAlt)
      if (rainy) { top = mix(top, '#0b1526', 0.6); bot = mix(bot, '#1a2740', 0.6) }
      const sky = ctx!.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, top); sky.addColorStop(1, bot)
      ctx!.fillStyle = sky; ctx!.fillRect(0, 0, W, H)

      // sun bloom in its true direction
      if (fix && sunAlt > -6) {
        const p = project(fix.sunAz, Math.max(sunAlt, 1), W, H)
        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, W * 1.1)
        g.addColorStop(0, `rgba(255,225,170,${sunAlt > 0 ? 0.5 : 0.28})`)
        g.addColorStop(1, 'transparent')
        ctx!.globalCompositeOperation = 'screen'
        ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(p.x, p.y, W * 1.1, 0, 7); ctx!.fill()
        if (sunAlt > 0 && !(cloudy || rainy || snowy)) {
          ctx!.fillStyle = 'rgba(255,245,220,.95)'; ctx!.beginPath(); ctx!.arc(p.x, p.y, 26 * DPR, 0, 7); ctx!.fill()
        }
        ctx!.globalCompositeOperation = 'source-over'
      }

      // stars only in real night, and only when the sky isn't sealed over
      if (fix && sunAlt < -8 && !rainy && !(cloudy && !snowy)) {
        const tw = reduce ? 1 : 0.6 + 0.4 * Math.sin((now - t0) * 0.001)
        for (let i = 0; i < 130; i++) {
          const x = ((i * 9301 + 49297) % 233280) / 233280 * W
          const y = ((i * 4523 + 1013) % 233280) / 233280 * H * 0.6
          ctx!.globalAlpha = (0.2 + (i % 7) / 10) * tw
          ctx!.fillStyle = '#eaf1ff'
          ctx!.fillRect(x, y, 1.3 * DPR, 1.3 * DPR)
        }
        ctx!.globalAlpha = 1
      }

      // moon at its real position + phase
      if (fix && fix.moonAlt > 0) {
        const p = project(fix.moonAz, fix.moonAlt, W, H)
        if (p.vis) {
          const r = 24 * DPR
          const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5)
          g.addColorStop(0, 'rgba(220,230,255,.32)'); g.addColorStop(1, 'transparent')
          ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(p.x, p.y, r * 3.5, 0, 7); ctx!.fill()
          ctx!.fillStyle = '#1a2038'; ctx!.beginPath(); ctx!.arc(p.x, p.y, r, 0, 7); ctx!.fill()
          ctx!.save(); ctx!.beginPath(); ctx!.arc(p.x, p.y, r, 0, 7); ctx!.clip()
          const waxing = fix.moonPhase < 180
          const off = (1 - 2 * fix.moonFrac) * r
          ctx!.fillStyle = '#eef2ff'
          ctx!.beginPath(); ctx!.rect(waxing ? p.x : p.x - r * 2, p.y - r, r * 2, r * 2); ctx!.fill()
          ctx!.fillStyle = fix.moonFrac < 0.5 ? '#1a2038' : '#eef2ff'
          ctx!.beginPath(); ctx!.ellipse(p.x, p.y, Math.abs(off), r, 0, 0, 7); ctx!.fill()
          ctx!.restore()
        }
      }

      // precipitation, driven by the live condition
      if (drops.length) {
        ctx!.strokeStyle = snowy ? 'rgba(235,242,255,.7)' : 'rgba(190,210,240,.5)'
        ctx!.fillStyle = 'rgba(235,242,255,.85)'
        ctx!.lineWidth = 1.1 * DPR
        const slant = rainy ? 0.5 * DPR : 0
        if (!snowy) ctx!.beginPath()
        for (const d of drops) {
          if (snowy) { ctx!.beginPath(); ctx!.arc(d.x, d.y, d.l, 0, 7); ctx!.fill(); d.y += d.s * DPR; d.x += Math.sin(d.y * 0.02) * 0.5 }
          else { ctx!.moveTo(d.x, d.y); ctx!.lineTo(d.x - slant * d.l, d.y + d.l); d.y += d.s * DPR; d.x -= slant * d.s * DPR * 0.6 }
          if (d.y > H) { d.y = -20; d.x = Math.random() * W }
        }
        if (!snowy) ctx!.stroke()
      }

      // distant lightning (storm) — a glow from above, not a white strobe
      if (rainy && bucket === 'storm' && !reduce) {
        if (now - lastBolt > 2800 + Math.random() * 4000) { flash = 1; lastBolt = now }
        if (flash > 0.02) {
          const g = ctx!.createLinearGradient(0, 0, 0, H * 0.7)
          g.addColorStop(0, `rgba(210,224,255,${0.5 * flash})`); g.addColorStop(1, 'transparent')
          ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H * 0.7)
          flash *= 0.86
        }
      }

      // cinematic vignette for depth + chrome contrast
      const vg = ctx!.createRadialGradient(W / 2, H * 0.42, H * 0.2, W / 2, H * 0.5, H * 0.9)
      vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(4,6,14,0.5)')
      ctx!.fillStyle = vg; ctx!.fillRect(0, 0, W, H)

      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    if (reduce) requestAnimationFrame(draw) // one static frame

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [current, lat, lon])

  return <canvas ref={canvasRef} className="live-sky" aria-hidden="true" />
}
