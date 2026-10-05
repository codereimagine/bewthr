import { useEffect, useRef } from 'react'
import { useActiveCoords } from '../hooks/useActiveCoords'
import {
  sunAltAz,
  moonAltAz,
  sunArcWindow,
  moonArcWindow,
} from '../lib/astronomy'

// SKY PATH PANORAMA — the Imagined sky arc, V3: the sun and moon ride their REAL
// rise→set lines, computed from the xengine's altitude + azimuth (astronomy.ts).
// A first-person dusk horizon: azimuth spreads the path across (E→S→W), altitude is
// height, so the two paths differ exactly as the real sky does. Native 2D canvas +
// rAF (bewthr's stack, like LiveSky): on open each body sweeps up to its live
// position, then rests with a breathing glow. DPR-capped; reduced-motion = still.
// IMAGINED-ONLY (mounted only from SkySun's imagined branch); coords stay inside the
// useActiveCoords closure (PRIVACY-002).

interface PathPt { t: number; alt: number; az: number }
interface Body {
  pts: PathPt[]
  riseMs: number
  setMs: number
  core: string
  glow: string
  up: (d: Date) => { altitude: number; azimuth: number }
  isMoon: boolean
}

const SAMPLES = 48
const REVEAL_MS = 1400

export function SkyPathPanorama() {
  const { lat, lon } = useActiveCoords()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || lat === null || lon === null) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce =
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches

    // --- build both bodies' real paths from the engine (recomputed on coord change) ---
    const buildPath = (
      win: { rise: Date | null; set: Date | null },
      altaz: (d: Date) => { altitude: number; azimuth: number },
    ): PathPt[] => {
      if (!win.rise || !win.set) return []
      const riseMs = win.rise.getTime()
      const span = win.set.getTime() - riseMs
      if (span <= 0) return []
      const pts: PathPt[] = []
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES
        const { altitude, azimuth } = altaz(new Date(riseMs + t * span))
        pts.push({ t, alt: altitude, az: azimuth })
      }
      return pts
    }
    const now0 = new Date()
    const sWin = sunArcWindow(lat, lon, now0)
    const mWin = moonArcWindow(lat, lon, now0)
    const bodies: Body[] = []
    const sPts = buildPath(sWin, (d) => sunAltAz(lat, lon, d))
    if (sPts.length && sWin.rise && sWin.set)
      bodies.push({ pts: sPts, riseMs: sWin.rise.getTime(), setMs: sWin.set.getTime(), core: '#f6dca8', glow: '255,180,94', up: (d) => sunAltAz(lat, lon, d), isMoon: false })
    const mPts = buildPath(mWin, (d) => moonAltAz(lat, lon, d))
    if (mPts.length && mWin.rise && mWin.set)
      bodies.push({ pts: mPts, riseMs: mWin.rise.getTime(), setMs: mWin.set.getTime(), core: '#dfebff', glow: '150,190,255', up: (d) => moonAltAz(lat, lon, d), isMoon: true })
    if (!bodies.length) return

    // projection bounds from the real data (both paths fit, with padding)
    let azMin = 360, azMax = 0, altMax = 10
    for (const b of bodies) for (const p of b.pts) { if (p.az < azMin) azMin = p.az; if (p.az > azMax) azMax = p.az; if (p.alt > altMax) altMax = p.alt }
    azMin -= 8; azMax += 8; altMax = Math.min(90, altMax + 10)

    // fixed starfield (seeded, so it doesn't swim between frames)
    let sd = 7; const rnd = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280 }
    const stars = Array.from({ length: 64 }, () => [rnd(), rnd(), rnd() * 1.3, rnd() * 0.5 + 0.2])

    let W = 0, H = 0, DPR = 1, hY = 0, mL = 18, mR = 18
    const ax = (az: number) => mL + ((az - azMin) / (azMax - azMin)) * (W / DPR - mL - mR)
    const ay = (alt: number) => hY - (Math.max(0, alt) / altMax) * (hY - 26)

    function resize() {
      if (!canvas) return
      DPR = Math.min(devicePixelRatio || 1, 2)
      const r = canvas.getBoundingClientRect()
      W = Math.round(r.width * DPR); H = Math.round(r.height * DPR)
      canvas.width = W; canvas.height = H
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
      hY = (H / DPR) * 0.82
    }

    const start = performance.now()
    function draw(tMs: number) {
      if (!canvas || !ctx) return
      const cw = W / DPR, ch = H / DPR
      const now = new Date()
      const reveal = reduce ? 1 : Math.min(1, (tMs - start) / REVEAL_MS)
      const breathe = reduce ? 0 : 0.5 + 0.5 * Math.sin(tMs / 1500)

      // transparent — blend into the (dark) card; only a faint horizon glow, no box
      ctx.clearRect(0, 0, cw, ch)
      const g = ctx.createLinearGradient(0, hY * 0.5, 0, hY)
      g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(1, 'rgba(255,158,78,0.1)')
      ctx.fillStyle = g; ctx.fillRect(0, hY * 0.5, cw, hY - hY * 0.5)
      // stars (subtle)
      for (const [sx, sy, sr, sa] of stars) { ctx.globalAlpha = (sa as number) * 0.7; ctx.fillStyle = '#9fb6dd'; ctx.beginPath(); ctx.arc((sx as number) * cw, (sy as number) * hY * 0.6, sr as number, 0, 7); ctx.fill() }
      ctx.globalAlpha = 1
      // horizon line (no solid ground fill — the card shows through)
      ctx.strokeStyle = 'rgba(160,190,235,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, hY); ctx.lineTo(cw, hY); ctx.stroke()
      // compass ticks (only those inside range)
      ctx.fillStyle = 'rgba(160,190,235,0.6)'; ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center'
      for (const [t, az] of [['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270]] as [string, number][]) {
        if (az < azMin || az > azMax) continue
        ctx.fillText(t, ax(az), hY + 12)
      }
      // legend — which line is which
      ctx.textAlign = 'left'; ctx.font = '9px ui-monospace, monospace'
      ctx.fillStyle = '#f6dca8'; ctx.beginPath(); ctx.arc(9, 10, 3, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(235,218,180,0.92)'; ctx.fillText('SUN', 16, 13)
      ctx.fillStyle = '#dfebff'; ctx.beginPath(); ctx.arc(52, 10, 3, 0, 7); ctx.fill()
      ctx.fillStyle = 'rgba(210,225,255,0.92)'; ctx.fillText('MOON', 59, 13)

      for (const b of bodies) {
        const live = b.up(now)
        const isUp = live.altitude > 0
        const span = b.setMs - b.riseMs
        const frac = span > 0 ? Math.max(0, Math.min(1, (now.getTime() - b.riseMs) / span)) : 0
        const P = b.pts.map((p) => ({ t: p.t, x: ax(p.az), y: ay(p.alt) }))
        // full path (faint, dashed)
        ctx.setLineDash([3, 5]); ctx.lineWidth = 1.5
        ctx.strokeStyle = b.isMoon ? 'rgba(205,220,255,0.22)' : 'rgba(240,206,150,0.22)'
        ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke()
        ctx.setLineDash([])
        if (isUp) {
          // elapsed (bright, glowing), revealed up to frac*reveal
          const upto = frac * reveal
          const cut = P.filter((p) => p.t <= upto)
          if (cut.length > 1) {
            ctx.save(); ctx.shadowColor = `rgba(${b.glow},0.85)`; ctx.shadowBlur = 10
            ctx.strokeStyle = b.core; ctx.lineWidth = 3.5; ctx.lineCap = 'round'
            ctx.beginPath(); cut.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.restore()
          }
          // body at the revealed position (sweeps to live, then rests)
          const bp = P.reduce((a, c) => (Math.abs(c.t - upto) < Math.abs(a.t - upto) ? c : a))
          const R = (b.isMoon ? 22 : 28) * (1 + breathe * 0.22)
          const rg = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, R)
          rg.addColorStop(0, b.isMoon ? 'rgba(220,235,255,0.9)' : 'rgba(255,220,150,0.95)')
          rg.addColorStop(0.2, `rgba(${b.glow},${0.4 + breathe * 0.2})`)
          rg.addColorStop(1, `rgba(${b.glow},0)`)
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(bp.x, bp.y, R, 0, 7); ctx.fill()
          ctx.fillStyle = b.core; ctx.beginPath(); ctx.arc(bp.x, bp.y, b.isMoon ? 5 : 6.5, 0, 7); ctx.fill()
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw)
    }

    let raf = 0
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(performance.now()) })
    resize(); ro.observe(canvas)
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [lat, lon])

  return <canvas ref={canvasRef} className="sky-path-canvas" aria-hidden="true" />
}
