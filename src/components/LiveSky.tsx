import { useEffect, useRef } from 'react'
import { useActiveCoords } from '../hooks/useActiveCoords'
import { getSun, getMoon } from '../lib/astronomy'
import { projectStars, projectStarsInto, type Star } from '../lib/starField'
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

// Continuum Play: a continuous sky clock the rAF loop advances itself, so the sun/
// moon/sky glide at the display refresh instead of stepping once per React re-render.
// sky-time (ms) at wall-time `now` = base + rate * (now - startPerf), clamped to endMs.
export interface PlayClock {
  base: number        // sky-time (ms) at play start
  rate: number        // sky-ms per wall-ms (≈1440 at the default Play speed)
  startPerf: number   // performance.now() captured at play start
  endMs: number       // sky-time (ms) at the end of the tour — clamp, never overshoot
}

interface LiveSkyProps {
  current: CurrentWeather | null | undefined
  // Continuum (P2): the hour to render. Omitted/undefined = now — Imagined, unchanged.
  time?: Date | null
  // Continuum: a living sky — stars twinkle + drift, with a device-tilt parallax (3D).
  // Off = Imagined/Classic, byte-for-byte unchanged.
  alive?: boolean
  // Continuum Play only: when set, the sky time is driven continuously inside the rAF
  // loop (not via React), so Play glides. Null/omitted = discrete `time` (idle/scrub).
  play?: PlayClock | null
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
// The Continuum star field is the REAL Yale Bright Star Catalogue (src/lib/brightStars),
// projected to local alt/az through the xengine — so actual constellations appear in
// their true positions and rotate with the real sky as the hour is scrubbed.

// Parse a colour to [r,g,b]. Handles both `#rrggbb` AND `rgb(r,g,b)` so a colour
// that was already produced by mix() can be safely mixed again (the rain path
// re-mixes skyStops output — feeding an rgb() string here previously produced NaN
// and crashed the gradient on every rainy frame).
function hex(h: string): [number, number, number] {
  if (h.charCodeAt(0) === 35 /* '#' */) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
  }
  const m = h.match(/\d+/g)
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [0, 0, 0]
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
  const d = ((az - FACE + 540) % 360) - 180
  return { x: W / 2 + (d / (FOV / 2)) * (W / 2), y: H - (alt / 90) * H, vis: Math.abs(d) < FOV / 2 }
}

// Celestial fix (sun + moon alt/az + phase) for a place and instant — shared by the
// discrete time effect and the per-frame Play clock so both compute it identically.
function celestialFix(lat: number, lon: number, when: Date): Fix {
  const sun = getSun(lat, lon, when)
  const moon = getMoon(lat, lon, when)
  return {
    sunAlt: sun.altitude, sunAz: sun.azimuth,
    moonAlt: moon.altitude, moonAz: moon.azimuth,
    moonPhase: moon.phaseAngle, moonFrac: moon.illumination,
  }
}

// Star projection (full real catalogue, horizon-culled) lives in lib/starField — see
// its unit test for the accurate-count guarantee. Star type + projectStars(Into) imported above.

// Draw a real moon: a warm, limb-darkened sphere (not a flat disc) with soft maria and the
// true phase terminator. `frac` = illuminated fraction (0..1), `phase` = phase angle (deg,
// <180 = waxing → lit on the right). Night = crisp warm moon; day = pale washed sphere.
// Pure canvas; called on the static layer (Imagined) and the dynamic layer (Continuum parallax).
function drawMoon(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  frac: number, phase: number, night: boolean,
) {
  const waxing = phase < 180
  // Soft outer glow (the moon sits in a faint halo).
  const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3.5)
  glow.addColorStop(0, `rgba(255,250,235,${night ? 0.3 : 0.1})`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 3.5, 0, 7); ctx.fill()
  // Warm body gradient — highlight offset toward the SUNLIT limb so it reads as a 3D sphere.
  const hx = cx + (waxing ? r * 0.38 : -r * 0.38), hy = cy - r * 0.22
  const body = ctx.createRadialGradient(hx, hy, r * 0.1, cx, cy, r)
  if (night) { body.addColorStop(0, '#fff8ea'); body.addColorStop(0.62, '#e9e2c6'); body.addColorStop(1, '#ada785') }
  else { body.addColorStop(0, '#f3f6fc'); body.addColorStop(0.7, '#dde5f1'); body.addColorStop(1, '#b7c1d6') }
  const shadeCol = night ? 'rgba(9,13,28,0.94)' : 'rgba(150,165,195,0.8)'
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip()
  // Unlit base, then paint the lit hemisphere warm, then the phase terminator ellipse
  // (same proven 2-ellipse geometry as before, now filled with the sphere gradient).
  ctx.fillStyle = shadeCol; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
  const moff = (1 - 2 * frac) * r
  ctx.fillStyle = body; ctx.beginPath(); ctx.rect(waxing ? cx : cx - 2 * r, cy - r, 2 * r, 2 * r); ctx.fill()
  ctx.fillStyle = frac < 0.5 ? shadeCol : body; ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(moff), r, 0, 0, 7); ctx.fill()
  // Maria — a few stable soft seas for texture (negligible over the dark shadow side).
  ctx.fillStyle = night ? 'rgba(120,118,98,0.18)' : 'rgba(150,160,185,0.14)'
  for (const [mx, my, ms] of [[-0.26, -0.18, 0.4], [0.22, 0.12, 0.33], [-0.04, 0.36, 0.28], [0.34, -0.3, 0.22]] as const) {
    ctx.beginPath(); ctx.ellipse(cx + mx * r, cy + my * r, ms * r, ms * r * 0.78, 0.4, 0, 7); ctx.fill()
  }
  ctx.restore()
  // Crisp limb rim.
  ctx.strokeStyle = night ? 'rgba(255,250,235,0.16)' : 'rgba(220,230,245,0.28)'
  ctx.lineWidth = Math.max(0.5, r * 0.03); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke()
}

// CLOUD POOL — a fixed set of clouds seeded ONCE. A condition change doesn't re-seed/reshuffle;
// it just retargets each cloud's opacity (active if within the new count) and the field fades to
// match. CLOUD_RANK is the activation order: the first `cn` by rank are spread across the sky for
// ANY count, and raising cn only ADDS clouds (nested) — partly→cloudy→overcast fills in.
//
// DRIFT WRAP — each cloud drifts right and wraps over CLOUD_SPAN screen-widths. The span is wide
// enough (> 1 + 2× the max cloud radius, in widths) that a cloud fully leaves the screen before it
// reappears on the far side, so the wrap is never an on-screen "teleport". And each lap the cloud
// takes a fresh height/size (frnd keyed by lap), so repeated passes look like new clouds, not a
// visible loop. The pool is oversized because only ~1/CLOUD_SPAN of it is on screen at once.
const CLOUD_POOL = 22
const CLOUD_SPAN = 2.4      // drift period, in screen-widths (off-screen wrap)
const CLOUD_MARGIN = 0.7    // left offset of the span → clouds exit fully (≥ max radius in widths)
const CLOUD_RANK: number[] = (() => {
  const r: number[] = []
  Array.from({ length: CLOUD_POOL }, (_, i) => ({ i, k: (i * 0.6180339887) % 1 }))
    .sort((a, b) => a.k - b.k)
    .forEach((o, rank) => { r[o.i] = rank })
  return r
})()
const frnd = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x) }   // stable per-seed [0,1)
type Cloud = { x: number; spd: number; seed: number; rnd: number; o: number; to: number }
const cloudH = (seed: number, lap: number) => 0.05 + frnd(seed * 7.3 + lap * 1.7) * 0.42   // fractional y, varies per lap
const cloudR = (seed: number, lap: number) => 120 + frnd(seed * 3.1 + lap * 2.9) * 130      // base radius, varies per lap
const DARK_CLEAR: [number, number, number] = [34, 42, 66]
// Counts are POOL slots (≈1/CLOUD_SPAN on screen): overcast ≈9 on screen, cloudy ≈6, partly ≈3.
const cloudCount = (rainy: boolean, overcast: boolean, cloudy: boolean, code: number) =>
  rainy ? 19 : overcast ? 22 : cloudy ? 14 : (code === 1 || code === 2) ? 7 : 0

export function LiveSky({ current, time, alive = false, play = null }: LiveSkyProps) {
  const { lat, lon } = useActiveCoords()
  const skyRef = useRef<HTMLCanvasElement>(null)
  const rainRef = useRef<HTMLCanvasElement>(null)
  const fixRef = useRef<Fix | null>(null)
  const tiltRef = useRef({ x: 0, y: 0 })   // device-tilt parallax (Continuum "alive" only)
  const starsRef = useRef<Star[]>([])
  const starCountRef = useRef(0)      // valid entries in starsRef (play reuses a buffer)
  const starBufRef = useRef<Star[]>([])  // reused per-frame buffer during Play (no alloc)
  const lastStarKeyRef = useRef('')   // throttle star recompute to ~15-min steps (idle/scrub only)
  const cloudsRef = useRef<Cloud[]>([])  // persistent cloud pool — survives condition changes, fades to target
  const darkCurRef = useRef<[number, number, number]>([...DARK_CLEAR])  // cloud base colour, cross-faded on condition change
  const precipFRef = useRef(0)   // rain/snow opacity, faded in so precipitation doesn't pop on
  const staticDirtyRef = useRef(true) // repaint the static sky layer next frame (time/fix changed)
  const playRef = useRef<PlayClock | null>(null)

  // The Play clock lives in a ref so changing it never tears down the canvas rAF loop
  // (the main effect below keeps running); the loop reads it each frame.
  useEffect(() => { playRef.current = play ?? null }, [play])

  // Recompute the celestial fix when coords / discrete time change. During Play this is
  // superseded every frame by the play clock inside the rAF loop (see frame()).
  useEffect(() => {
    if (lat == null || lon == null) { fixRef.current = null; return }
    const when = time ?? new Date()
    fixRef.current = celestialFix(lat, lon, when)
    staticDirtyRef.current = true   // sun/moon/sky moved → repaint the static layer next frame
    // Star field: project the real bright-star catalogue to this hour, throttled to ~15-min
    // sky-time buckets so scrubbing doesn't recompute the full catalogue every step. (alive only.)
    const starKey = alive ? `${Math.round(when.getTime() / 9e5)}|${lat.toFixed(2)}|${lon.toFixed(2)}` : ''
    if (starKey !== lastStarKeyRef.current) {
      lastStarKeyRef.current = starKey
      starsRef.current = alive ? projectStars(lat, lon, when) : []
      starCountRef.current = starsRef.current.length
    }
  }, [lat, lon, time, alive])

  // Continuum 3D: gentle parallax from device tilt. iOS needs a gesture to grant
  // motion access, so request it on the first tap; no-op if unavailable/denied.
  useEffect(() => {
    if (!alive || typeof window === 'undefined') return
    let attached = false
    const onOrient = (e: DeviceOrientationEvent) => {
      const gx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 25))
      const gy = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 25))
      tiltRef.current.x += (gx - tiltRef.current.x) * 0.12
      tiltRef.current.y += (gy - tiltRef.current.y) * 0.12
    }
    const attach = () => { if (!attached) { window.addEventListener('deviceorientation', onOrient); attached = true } }
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined
    let reqGesture: (() => void) | null = null
    if (DOE && typeof DOE.requestPermission === 'function') {
      reqGesture = () => { DOE.requestPermission!().then((r) => { if (r === 'granted') attach() }).catch(() => {}) }
      window.addEventListener('pointerdown', reqGesture, { once: true })
    } else {
      attach()
    }
    return () => {
      if (reqGesture) window.removeEventListener('pointerdown', reqGesture)
      if (attached) window.removeEventListener('deviceorientation', onOrient)
    }
  }, [alive])

  useEffect(() => {
    const sky = skyRef.current
    const rain = rainRef.current
    if (!sky || !rain) return
    // octx = the STATIC sky layer (painted once, then left alone so the browser
    // can cache it as a composited texture — no repaint while the page scrolls).
    // ctx = the transparent RAIN layer on top, the only surface the rAF loop touches.
    const octx = sky.getContext('2d')!
    const ctx = rain.getContext('2d')!

    // Faint noise tile for gradient DITHERING — 24-bit sky gradients band visibly (overcast /
    // dusk); a low-alpha noise over them hides the bands without reading as grain. Built once.
    const noiseTile = document.createElement('canvas'); noiseTile.width = 64; noiseTile.height = 64
    const ntx = noiseTile.getContext('2d')
    let noisePattern: CanvasPattern | null = null
    if (ntx) {
      const nimg = ntx.createImageData(64, 64)
      for (let i = 0; i < nimg.data.length; i += 4) { const v = (Math.random() * 255) | 0; nimg.data[i] = nimg.data[i + 1] = nimg.data[i + 2] = v; nimg.data[i + 3] = 255 }
      ntx.putImageData(nimg, 0, 0)
      noisePattern = octx.createPattern(noiseTile, 'repeat')
    }

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    // Preview-only overrides (harmless without the query params): let QA render the
    // sky at any condition / sun altitude to verify parity with a mockup.
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
    const forceWx = q.get('_wx') as WxBucket | null
    const forceAltStr = q.get('_sunalt')
    const forceAlt = forceAltStr != null ? parseFloat(forceAltStr) : null
    const bucket: WxBucket = forceWx || (current ? wxBucket(current.weather_code, current.is_day) : 'clear-night')
    const cloudy = bucket === 'cloud' || bucket === 'fog'
    const rainy = bucket === 'rain' || bucket === 'storm'
    const snowy = bucket === 'snow'

    const code = current ? current.weather_code : 0
    const overcast = code === 3 || bucket === 'fog'
    let W = 0, H = 0, DPR = 1
    let drops: { x: number; y: number; l: number; s: number }[] = []
    let lastW = -1, lastH = -1

    // Persistent cloud pool: seed once (stable positions), then on every (re)run — i.e. every
    // condition change — just retarget opacities toward the new count so the field MORPHS
    // instead of reshuffling. The alive loop fades c.o → c.to each frame; static sets it at once.
    const cn = cloudCount(rainy, overcast, cloudy, code)
    const darkTarget: [number, number, number] = rainy ? [14, 18, 30] : overcast ? [22, 28, 46] : DARK_CLEAR
    const freshPool = cloudsRef.current.length === 0
    if (freshPool) {
      cloudsRef.current = Array.from({ length: CLOUD_POOL }, (_, i): Cloud => ({
        // start position spread across the full drift span (not just the screen), so clouds are
        // always entering/leaving from off-screen rather than all being visible at once.
        x: ((i + 0.5) / CLOUD_POOL) * CLOUD_SPAN + (frnd(i + 1.7) - 0.5) * (CLOUD_SPAN / CLOUD_POOL) * 0.8,
        spd: 0.15 + frnd(i + 2.1) * 0.3,
        seed: i + 1,                      // height/size vary per lap, keyed by this + lap
        rnd: frnd(i + 6.5),               // per-cloud opacity offset
        o: 0, to: 0,
      }))
      darkCurRef.current = [...darkTarget]
    }
    const baseOpac = rainy || overcast ? 0.5 : 0.34
    for (let i = 0; i < CLOUD_POOL; i++) {
      const c = cloudsRef.current[i]
      c.to = CLOUD_RANK[i] < cn ? baseOpac + c.rnd * 0.2 : 0
      if (freshPool || !alive) c.o = c.to   // no fade on first paint or in the static (Imagined) layer
    }
    function resize() {
      DPR = Math.min(devicePixelRatio || 1, 2)
      const r = rain!.getBoundingClientRect()
      const nw = Math.max(1, Math.round(r.width * DPR))
      const nh = Math.max(1, Math.round(r.height * DPR))
      if (nw === lastW && nh === lastH) return // spurious observer fire — ignore
      const widthChanged = nw !== lastW
      W = nw; H = nh; lastW = nw; lastH = nh
      sky!.width = W; sky!.height = H
      rain!.width = W; rain!.height = H
      // Re-seed clouds/drops ONLY when the width changes. A vertical scroll on mobile
      // hides/shows the URL bar → height-only change; re-randomizing there makes the
      // clouds visibly jump ("loop to the bottom"). Cloud x/y are fractional, so they
      // rescale to the new height on their own — no jump, no reshuffle.
      if (widthChanged) {
        const n = rainy ? 220 : snowy ? 140 : 0
        drops = Array.from({ length: n }, () => ({
          x: Math.random() * W, y: Math.random() * H,
          l: snowy ? 2.5 * DPR : (10 + Math.random() * 18) * DPR,
          s: snowy ? 1 + Math.random() * 1.5 : 7 + Math.random() * 9,
        }))
        if (n > 0) precipFRef.current = 0   // fade precipitation in from nothing (no pop-on)
      }
      // Clouds come from the persistent pool (DPR applied at render), not re-seeded here.
      renderStatic()
    }
    // Debounce observer fires to one per frame so a burst of scroll-driven
    // resizes can't thrash the repaint.
    let roPending = false
    const ro = new ResizeObserver(() => {
      if (roPending) return
      roPending = true
      requestAnimationFrame(() => { roPending = false; resize() })
    })
    ro.observe(rain)
    resize()

    let raf = 0
    let prevNow = 0   // previous frame time — for TIME-BASED fades only (motion stays pure f(t))
    let flash = 0
    let lastBolt = 0

    // STATIC sky -> its own layer. Rebuilt only on resize / condition / coords change,
    // never per animation frame — so the compositor keeps it cached during scroll.
    function renderStatic() {
      const fix = fixRef.current
      const sunAlt = forceAlt != null ? forceAlt : (fix ? fix.sunAlt : -30)
      octx.clearRect(0, 0, W, H)
      const [top0, bot] = skyStops(sunAlt)
      const top = rainy ? mix(top0, '#0b1526', 0.35) : top0
      const sky = octx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, top); sky.addColorStop(1, bot)
      octx.fillStyle = sky; octx.fillRect(0, 0, W, H)
      // Dither the sky gradient to kill 24-bit colour banding (very low alpha — perceptible
      // only as smoother bands, never as grain).
      if (noisePattern) { octx.save(); octx.globalAlpha = 0.03; octx.fillStyle = noisePattern; octx.fillRect(0, 0, W, H); octx.restore() }
      const twilight = sunAlt > -8
      const hz = octx.createLinearGradient(0, H * 0.55, 0, H)
      hz.addColorStop(0, 'rgba(0,0,0,0)')
      hz.addColorStop(1, twilight ? 'rgba(255,180,120,.24)' : 'rgba(120,140,195,.12)')
      octx.fillStyle = hz; octx.fillRect(0, H * 0.55, W, H * 0.45)
      // Continuum atmospheric depth: the zenith sits a touch deeper than the horizon — a subtle
      // 3D cue that also lifts header/readout contrast at night. Faint; night only.
      if (alive && sunAlt < -6) {
        const dep = octx.createLinearGradient(0, 0, 0, H * 0.5)
        dep.addColorStop(0, 'rgba(0,0,8,0.22)'); dep.addColorStop(1, 'rgba(0,0,8,0)')
        octx.fillStyle = dep; octx.fillRect(0, 0, W, H * 0.5)
      }
      if (fix && sunAlt > -6) {
        const pp = project(fix.sunAz, Math.max(sunAlt, 1), W, H)
        const g = octx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, W * 1.1)
        g.addColorStop(0, `rgba(255,225,170,${sunAlt > 0 ? 0.5 : 0.28})`); g.addColorStop(1, 'transparent')
        octx.globalCompositeOperation = 'screen'
        octx.fillStyle = g; octx.beginPath(); octx.arc(pp.x, pp.y, W * 1.1, 0, 7); octx.fill()
        if (sunAlt > 0 && !(cloudy || rainy || snowy)) {
          // soft-edged sun glow (not a hard opaque disc blob over the UI)
          const sr = 30 * DPR
          const sg = octx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, sr)
          sg.addColorStop(0, 'rgba(255,248,226,0.9)'); sg.addColorStop(0.5, 'rgba(255,240,200,0.45)'); sg.addColorStop(1, 'transparent')
          octx.fillStyle = sg; octx.beginPath(); octx.arc(pp.x, pp.y, sr, 0, 7); octx.fill()
        }
        octx.globalCompositeOperation = 'source-over'
      }
      if (fix && sunAlt < -8 && !rainy && !overcast && !alive) {
        const dim = cloudy ? 0.5 : 1
        for (let i = 0; i < 180; i++) {
          const x = ((i * 9301 + 49297) % 233280) / 233280 * W
          const y = ((i * 4523 + 1013) % 233280) / 233280 * H * 0.62
          const bright = i % 11 === 0
          octx.globalAlpha = (0.42 + (i % 5) / 8) * dim
          octx.fillStyle = bright ? '#ffffff' : '#dfe8ff'
          const s = (bright ? 2.3 : 1.3) * DPR
          octx.fillRect(x, y, s, s)
        }
        octx.globalAlpha = 1
      }
      // Imagined: the moon rides on the static backdrop. Continuum (alive) draws it on the
      // dynamic layer instead, so it parallaxes with tilt — see the alive block below.
      if (fix && fix.moonAlt > 0 && !rainy && !overcast && !alive) {
        const pp = project(fix.moonAz, fix.moonAlt, W, H)
        if (pp.vis) {
          // Fades toward a faint PALE daytime sphere as the sun climbs (a real daytime moon is
          // washed out); crisp warm moon only at night. Tracks its true az/alt like the sun.
          const sa = fix.sunAlt
          octx.globalAlpha = sa <= 0 ? 1 : Math.max(0.12, 1 - sa / 7)
          drawMoon(octx, pp.x, pp.y, 24 * DPR, fix.moonFrac, fix.moonPhase, sa < 0)
          octx.globalAlpha = 1
        }
      }
      if (cloudsRef.current.length && !alive) {
        const dayLit = !!(fix && fix.sunAlt > 0)
        const src = dayLit ? project(fix!.sunAz, Math.max(fix!.sunAlt, 5), W, H) : (fix && fix.moonAlt > 0 ? project(fix.moonAz, Math.max(fix.moonAlt, 5), W, H) : { x: W * 0.5, y: 0, vis: false })
        const dark = rainy ? '14,18,30' : overcast ? '22,28,46' : '34,42,66'
        const litCol = dayLit ? 'rgba(240,244,255,0.42)' : 'rgba(150,168,218,0.22)'
        for (const c of cloudsRef.current) {
          if (c.o < 0.01) continue
          const rr = cloudR(c.seed, 0) * DPR
          const x = (((c.x % CLOUD_SPAN) - CLOUD_MARGIN)) * W
          if (x < -rr * 1.2 || x > W + rr * 1.2) continue   // off-screen — skip
          const y = cloudH(c.seed, 0) * H * 0.55
          const base = octx.createRadialGradient(x, y + rr * 0.15, 0, x, y + rr * 0.15, rr)
          base.addColorStop(0, `rgba(${dark},${c.o})`); base.addColorStop(1, `rgba(${dark},0)`)
          octx.fillStyle = base; octx.beginPath(); octx.arc(x, y + rr * 0.15, rr, 0, 7); octx.fill()
          const lx = x + (src.x - x) * 0.1, ly = y - rr * 0.22
          const crown = octx.createRadialGradient(lx, ly, 0, lx, ly, rr * 0.8)
          crown.addColorStop(0, litCol); crown.addColorStop(1, 'transparent')
          octx.fillStyle = crown; octx.beginPath(); octx.arc(lx, ly, rr * 0.8, 0, 7); octx.fill()
        }
      }
      const vg = octx.createRadialGradient(W / 2, H * 0.42, H * 0.25, W / 2, H * 0.5, H * 0.95)
      vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(4,6,14,0.3)')
      octx.fillStyle = vg; octx.fillRect(0, 0, W, H)
    }

    // PER FRAME: only the transparent rain layer is cleared + redrawn (+ lightning).
    // The sky beneath is untouched, so a frame costs a clear + thin strokes, nothing more.
    function frame(now: number) {
      // CONTINUUM PLAY: advance the sky clock continuously here (not through React), so the
      // sun/moon/sky AND the star field glide at the display refresh. getSun/getMoon are cheap
      // trig; the full-catalogue projection is ~0.5ms (measured) so it runs every frame too — into a
      // reused buffer, no allocation. Supersedes the discrete time effect while playing.
      const pl = playRef.current
      if (pl && lat != null && lon != null) {
        const whenMs = Math.min(pl.endMs, pl.base + pl.rate * (now - pl.startPerf))
        const when = new Date(whenMs)
        fixRef.current = celestialFix(lat, lon, when)
        if (alive) { starCountRef.current = projectStarsInto(starBufRef.current, lat, lon, when); starsRef.current = starBufRef.current }
        lastStarKeyRef.current = ''   // force a fresh throttled recompute when Play stops
        staticDirtyRef.current = true
      }
      // Repaint the static sky layer only when the celestial fix changed (scrub / play frame),
      // not every bucket via an effect re-run — that teardown/rebuild was the Play stutter.
      if (staticDirtyRef.current) { staticDirtyRef.current = false; renderStatic() }
      // Motion is positioned from the clock t (seconds), exactly like the xengine-projected
      // sun/moon/stars — so cloud drift and rain/snow fall are correct at ANY refresh (60 or
      // 120fps) with no per-frame step factor. Nothing here accumulates per frame.
      const t = now * 0.001
      // Opacity/colour fades eased by elapsed time (τ≈220ms), NOT per-frame — so a cloud
      // condition change settles in the same ~0.5s at 60 AND 120fps (per-frame easing ran
      // twice as fast at 120, snapping the transition — the Play choppiness).
      const dtF = prevNow ? Math.min(100, now - prevNow) : 16.7
      prevNow = now
      const fadeK = 1 - Math.exp(-dtF / 220)
      ctx.clearRect(0, 0, W, H)
      // Living sky (Continuum): clouds drift and stars twinkle on the animated layer
      // every frame — alive when idle, not just while scrubbing. A continuous
      // auto-parallax (plus device tilt, if granted) gives the 3D depth without needing
      // the motion permission. Imagined keeps its static field (alive=false).
      if (alive) {
        const ax = Math.sin(t * 0.26) * 0.4 + tiltRef.current.x * 1.5   // gentle auto orbit + strong tilt parallax
        const ay = Math.cos(t * 0.19) * 0.3 + tiltRef.current.y * 1.5
        const fix = fixRef.current
        const sunAlt = forceAlt != null ? forceAlt : (fix ? fix.sunAlt : -30)
        if (cloudsRef.current.length) {
          // Day/night as a SMOOTH ramp across the dawn/dusk band (sunAlt −6°..+6°) so the cloud
          // lighting eases through sunrise instead of popping when the sun crosses the horizon.
          const dayF = Math.max(0, Math.min(1, ((fix ? fix.sunAlt : -30) + 6) / 12))
          // Light from the sun once it's near/above the horizon (dayF>0) — kept on the sun for
          // the whole sunrise so the highlight direction never jumps; moon (or straight down)
          // only in deep night, where the crown is darkest and the switch is invisible.
          const src = dayF > 0
            ? project(fix!.sunAz, Math.max(fix!.sunAlt, 5), W, H)
            : (fix && fix.moonAlt > 0 ? project(fix.moonAz, Math.max(fix.moonAlt, 5), W, H) : { x: W * 0.5, y: 0, vis: false })
          // Cross-fade the cloud base colour toward this condition's target (~0.8s) so a change
          // like cloudy→overcast eases in. darkTarget is captured per effect run (= condition).
          const dc = darkCurRef.current
          dc[0] += (darkTarget[0] - dc[0]) * fadeK; dc[1] += (darkTarget[1] - dc[1]) * fadeK; dc[2] += (darkTarget[2] - dc[2]) * fadeK
          const dark = `${Math.round(dc[0])},${Math.round(dc[1])},${Math.round(dc[2])}`
          // Crown colour interpolated night→day by dayF (hue AND alpha) — the dawn ease.
          const lr = Math.round(150 + 90 * dayF), lg = Math.round(168 + 76 * dayF), lb = Math.round(218 + 37 * dayF)
          const litCol = `rgba(${lr},${lg},${lb},${(0.22 + 0.20 * dayF).toFixed(3)})`
          for (const c of cloudsRef.current) {
            c.o += (c.to - c.o) * fadeK   // fade toward the condition target — the morph, not a reshuffle
            if (c.o < 0.01) continue
            // Drift positioned from t (f(t), frame-rate independent). Wrap over CLOUD_SPAN widths so
            // a cloud fully exits before reappearing (no on-screen teleport), and take a fresh
            // height/size each lap so repeated passes read as new clouds, not a visible loop.
            const cx = c.x + c.spd * 0.24 * t
            const lap = Math.floor(cx / CLOUD_SPAN)
            const xu = cx - lap * CLOUD_SPAN                 // position within this lap, [0, CLOUD_SPAN)
            const rr = cloudR(c.seed, lap) * DPR
            const x = (xu - CLOUD_MARGIN) * W + ax * 22 * DPR
            if (x < -rr * 1.2 || x > W + rr * 1.2) continue  // off-screen — skip the draw
            const co = c.o * (0.82 + 0.18 * Math.sin(t * 0.3 + xu * 11))   // gentle billow
            const y = cloudH(c.seed, lap) * H * 0.55 + ay * 12 * DPR
            const base = ctx.createRadialGradient(x, y + rr * 0.15, 0, x, y + rr * 0.15, rr)
            base.addColorStop(0, `rgba(${dark},${co})`); base.addColorStop(1, `rgba(${dark},0)`)
            ctx.fillStyle = base; ctx.beginPath(); ctx.arc(x, y + rr * 0.15, rr, 0, 7); ctx.fill()
            const lx = x + (src.x - x) * 0.1, ly = y - rr * 0.22
            const crown = ctx.createRadialGradient(lx, ly, 0, lx, ly, rr * 0.8)
            crown.addColorStop(0, litCol); crown.addColorStop(1, 'transparent')
            ctx.fillStyle = crown; ctx.beginPath(); ctx.arc(lx, ly, rr * 0.8, 0, 7); ctx.fill()
          }
        }
        if (sunAlt < -4 && !rainy && !overcast) {
          // Twilight fade: stars ease in across the dusk band (sunAlt -4°..-10°) rather than
          // popping on at -8°, so day↔night glides. starF = 0 at -4°, 1 by -10°.
          const starF = Math.max(0, Math.min(1, (-4 - sunAlt) / 6))
          const dim = (cloudy ? 0.5 : 1) * starF
          const starArr = starsRef.current, starN = starCountRef.current
          for (let k = 0; k < starN; k++) {
            const st = starArr[k]
            const pp = project(st.az, st.alt, W, H)
            if (!pp.vis) continue
            const bf = st.bf                              // 0..1 brightness (real magnitude)
            const depth = 0.14 + bf * 0.95                // wider near↔far spread = deeper 3D field
            const x = pp.x + ax * depth * 44 * DPR
            const y = pp.y + ay * depth * 44 * DPR
            const tw = 0.62 + 0.38 * Math.sin(t * (1.1 + (1 - bf)) + st.ra * 3)
            const a = (0.4 + bf * 0.6) * dim * tw
            const s = (1 + bf * 2.2) * DPR
            if (bf > 0.3) {   // soft glow halo on the brighter stars — they pop forward
              const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 3.6)
              gr.addColorStop(0, `rgba(${st.tint},${a * 0.5})`)
              gr.addColorStop(1, 'transparent')
              ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s * 3.6, 0, 7); ctx.fill()
            }
            ctx.globalAlpha = a
            ctx.fillStyle = `rgb(${st.tint})`
            ctx.fillRect(x - s / 2, y - s / 2, s, s)
            if (bf > 0.6) {   // diffraction spikes on the brightest — the sparkle
              const spike = s * (2.4 + 2.4 * tw)
              ctx.globalAlpha = a * 0.55
              ctx.strokeStyle = `rgb(${st.tint})`
              ctx.lineWidth = Math.max(0.6, 0.5 * DPR)
              ctx.beginPath()
              ctx.moveTo(x - spike, y); ctx.lineTo(x + spike, y)
              ctx.moveTo(x, y - spike); ctx.lineTo(x, y + spike)
              ctx.stroke()
            }
          }
          ctx.globalAlpha = 1
        }
        // Continuum moon: drawn here (not the static backdrop) so it rides its own parallax
        // depth with device tilt — a nearer, 3D element against the deeper star field.
        if (fix && fix.moonAlt > 0 && !rainy && !overcast) {
          const pp = project(fix.moonAz, fix.moonAlt, W, H)
          if (pp.vis) {
            const sa = fix.sunAlt
            ctx.globalAlpha = sa <= 0 ? 1 : Math.max(0.12, 1 - sa / 7)
            drawMoon(ctx, pp.x + ax * 34 * DPR, pp.y + ay * 34 * DPR, 24 * DPR, fix.moonFrac, fix.moonPhase, sa < 0)
            ctx.globalAlpha = 1
          }
        }
      }
      if (drops.length) {
        precipFRef.current += (1 - precipFRef.current) * fadeK   // ease precipitation in (time-based)
        ctx!.save(); ctx!.globalAlpha = precipFRef.current
        ctx!.strokeStyle = snowy ? 'rgba(235,242,255,.7)' : 'rgba(190,210,240,.5)'
        ctx!.fillStyle = 'rgba(235,242,255,.85)'
        ctx!.lineWidth = 1.1 * DPR
        // Rain falls vertically ("dripping down"); only a storm leans it slightly.
        // Light rain (the common case) is straight down — no "sideways" look.
        const slant = bucket === 'storm' ? 0.3 * DPR : 0
        // Fall positioned from t: each drop's y is its seed offset by speed × elapsed seconds,
        // wrapped over the column (span = H + a little). Deterministic stream, no per-frame
        // accumulation and no random reset — correct at 60 AND 120fps. (d.s × DPR × 60 = the
        // old per-frame speed × 60fps, so the fall rate is unchanged.)
        const span = H + 24 * DPR
        if (!snowy) ctx!.beginPath()
        for (const d of drops) {
          const y = (((d.y + d.s * DPR * 60 * t) % span) + span) % span - 20
          if (snowy) { const x = d.x + Math.sin(y * 0.02) * 8 * DPR; ctx!.beginPath(); ctx!.arc(x, y, d.l, 0, 7); ctx!.fill() }
          else { ctx!.moveTo(d.x, y); ctx!.lineTo(d.x - slant * d.l, y + d.l) }
        }
        if (!snowy) ctx!.stroke()
        ctx!.restore()
      }
      if (rainy && bucket === 'storm' && !reduce) {
        if (now - lastBolt > 2800 + Math.random() * 4000) { flash = 1; lastBolt = now }
        if (flash > 0.02) {
          const g = ctx!.createLinearGradient(0, 0, 0, H * 0.7)
          g.addColorStop(0, `rgba(210,224,255,${0.5 * flash})`); g.addColorStop(1, 'transparent')
          ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H * 0.7); flash *= 0.86
        }
      }
      if (!reduce || alive) raf = requestAnimationFrame(frame)
    }

    // renderStatic() already ran inside resize(); kick off the animation loop.
    // Under reduced-motion this paints exactly one frame (frame() won't re-arm).
    raf = requestAnimationFrame(frame)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [current, lat, lon, alive])

  return (
    <>
      <canvas ref={skyRef} className="live-sky live-sky--static" aria-hidden="true" />
      <canvas ref={rainRef} className="live-sky live-sky--rain" aria-hidden="true" />
      <div className="live-sky live-sky--veil" aria-hidden="true" />
    </>
  )
}
