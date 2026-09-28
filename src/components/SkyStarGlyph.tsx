import { useId } from 'react'
import { CONSTELLATION_SHAPES, PLANET_STYLES } from '../lib/skyGlyphs'

interface SkyStarGlyphProps {
  kind: 'planet' | 'constellation'
  name: string
  brightness?: 'bright' | 'moderate' | 'dim'
}

// A small coloured glyph: a colour-true planet disc, or a constellation drawn as
// line-art (cyan-white stars, one gold lead star). Imagined-mode flourish.
export function SkyStarGlyph({ kind, name, brightness }: SkyStarGlyphProps) {
  const id = useId()

  if (kind === 'planet') {
    const s = PLANET_STYLES[name] ?? { core: '#dfeaff', glow: 'rgba(180,205,255,0.5)' }
    const gid = `pg-${id}`
    const r = brightness === 'bright' ? 8 : brightness === 'dim' ? 6 : 7
    return (
      <svg className="sky-obj-glyph" viewBox="0 0 30 30" width="30" height="30" role="img" aria-label={`${name}, planet`}>
        <defs>
          <radialGradient id={gid} cx="38%" cy="34%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor={s.core} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <circle cx="15" cy="15" r={r + 4} fill={s.glow} className="sky-glyph-halo" />
        {s.ring && (
          <ellipse cx="15" cy="15" rx={r + 4.5} ry={2.4} fill="none" stroke={s.ring} strokeWidth="1.1" transform="rotate(-20 15 15)" opacity="0.9" />
        )}
        <circle cx="15" cy="15" r={r} fill={`url(#${gid})`} />
        {s.band && (
          <path d={`M${15 - r},13.5 h${r * 2} M${15 - r},17 h${r * 2}`} stroke={s.band} strokeWidth="0.9" opacity="0.5" clipPath={`url(#clip-${id})`} />
        )}
        {s.band && <clipPath id={`clip-${id}`}><circle cx="15" cy="15" r={r} /></clipPath>}
      </svg>
    )
  }

  const shape = CONSTELLATION_SHAPES[name]
  if (!shape) {
    // graceful fallback — a small cluster
    return (
      <svg className="sky-obj-glyph" viewBox="0 0 30 30" width="30" height="30" role="img" aria-label={name}>
        <circle cx="11" cy="12" r="1.6" className="sky-star" />
        <circle cx="18" cy="16" r="1.6" className="sky-star" />
        <circle cx="14" cy="20" r="1.4" className="sky-star" />
      </svg>
    )
  }
  return (
    <svg className="sky-obj-glyph" viewBox="0 0 30 30" width="30" height="30" role="img" aria-label={`${name}, constellation`}>
      <g className="sky-lines">
        {shape.lines.map(([a, c], i) => (
          <line key={i} x1={shape.stars[a][0]} y1={shape.stars[a][1]} x2={shape.stars[c][0]} y2={shape.stars[c][1]} />
        ))}
      </g>
      {shape.stars.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === shape.lead ? 2 : 1.4} className={i === shape.lead ? 'sky-star sky-star--lead' : 'sky-star'} />
      ))}
    </svg>
  )
}
