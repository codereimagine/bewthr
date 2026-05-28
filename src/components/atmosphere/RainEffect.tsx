import { useMemo, type CSSProperties } from 'react'
import { mulberry32 } from './prng'

interface Raindrop {
  id: number
  left: string
  dur: string
  delay: string
}

const DROP_COUNT = 80
const SEED = 207

export function RainEffect() {
  const drops = useMemo<Raindrop[]>(() => {
    const r = mulberry32(SEED)
    const out: Raindrop[] = []
    for (let i = 0; i < DROP_COUNT; i++) {
      out.push({
        id: i,
        left: (r() * 100).toFixed(2) + '%',
        dur: (0.5 + r() * 0.5).toFixed(2) + 's',
        delay: (-r() * 1).toFixed(2) + 's',
      })
    }
    return out
  }, [])

  return (
    <>
      {drops.map((d) => (
        <div
          key={d.id}
          className="raindrop"
          style={
            {
              '--left': d.left,
              '--dur': d.dur,
              '--delay': d.delay,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}
