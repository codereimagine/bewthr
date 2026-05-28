import { useMemo, type CSSProperties } from 'react'
import { mulberry32 } from './prng'

interface Star {
  id: number
  large: boolean
  top: string
  left: string
  dur: string
  delay: string
}

const STAR_COUNT = 50
const SEED = 42

export function StarField() {
  const stars = useMemo<Star[]>(() => {
    const r = mulberry32(SEED)
    const out: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      out.push({
        id: i,
        large: r() > 0.85,
        top: (r() * 100).toFixed(2) + '%',
        left: (r() * 100).toFixed(2) + '%',
        dur: (3 + r() * 3).toFixed(2) + 's',
        delay: (-r() * 5).toFixed(2) + 's',
      })
    }
    return out
  }, [])

  return (
    <>
      {stars.map((s) => (
        <div
          key={s.id}
          className={s.large ? 'star lg' : 'star'}
          style={
            {
              '--top': s.top,
              '--left': s.left,
              '--dur': s.dur,
              '--delay': s.delay,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}
