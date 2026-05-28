import { useMemo, type CSSProperties } from 'react'
import { mulberry32 } from './prng'

interface Flake {
  id: number
  left: string
  dur: string
  delay: string
  swayDur: string
  swayDelay: string
}

const FLAKE_COUNT = 50
const SEED = 414

export function SnowEffect() {
  const flakes = useMemo<Flake[]>(() => {
    const r = mulberry32(SEED)
    const out: Flake[] = []
    for (let i = 0; i < FLAKE_COUNT; i++) {
      out.push({
        id: i,
        left: (r() * 100).toFixed(2) + '%',
        dur: (5 + r() * 5).toFixed(2) + 's',
        delay: (-r() * 8).toFixed(2) + 's',
        swayDur: (2 + r() * 3).toFixed(2) + 's',
        swayDelay: (-r() * 4).toFixed(2) + 's',
      })
    }
    return out
  }, [])

  return (
    <>
      {flakes.map((f) => (
        <div
          key={f.id}
          className="snow-track"
          style={
            {
              '--left': f.left,
              '--dur': f.dur,
              '--delay': f.delay,
            } as CSSProperties
          }
        >
          <div
            className="snow-sway"
            style={
              {
                '--sway-dur': f.swayDur,
                '--sway-delay': f.swayDelay,
              } as CSSProperties
            }
          >
            <div className="snowflake" />
          </div>
        </div>
      ))}
    </>
  )
}
