// SKY DIAL — a tiny N-up sky-position compass: direction = angle, altitude = distance
// from centre (centre = overhead, rim = horizon). Echoes the panorama's spatial language
// so the planet/constellation rows "read" as sky, not a flat list. Static SVG.
interface SkyDialProps {
  azimuth: number
  altitude: number
  tone: 'sun' | 'sky'
  label: string
}

const R = 17
const C = 20

export function SkyDial({ azimuth, altitude, tone, label }: SkyDialProps) {
  const col = tone === 'sun' ? '#f0ce96' : '#8fd6ff'
  const alt = Math.max(0, Math.min(90, altitude))
  const rr = ((90 - alt) / 90) * R
  const a = (azimuth * Math.PI) / 180
  const dx = C + Math.sin(a) * rr
  const dy = C - Math.cos(a) * rr
  return (
    <svg className="sky-dial" width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={label}>
      <circle className="sky-dial-ring" cx={C} cy={C} r={R} />
      <circle className="sky-dial-ring sky-dial-ring--in" cx={C} cy={C} r={R * 0.55} />
      <line className="sky-dial-spoke" x1={C - R} y1={C} x2={C + R} y2={C} />
      <line className="sky-dial-spoke" x1={C} y1={C - R} x2={C} y2={C + R} />
      <text className="sky-dial-n" x={C} y={C - R + 4} textAnchor="middle">N</text>
      <circle className="sky-dial-glow" cx={dx} cy={dy} r={6} style={{ fill: col }} />
      <circle className="sky-dial-dot" cx={dx} cy={dy} r={2.6} style={{ fill: col }} />
    </svg>
  )
}
