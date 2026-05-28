import { useMemo, type CSSProperties } from 'react'
import { mulberry32 } from './prng'

export type CloudVariant = 'warm' | 'cool' | 'cold'

interface CloudDriftProps {
  variant: CloudVariant
}

interface Cloud {
  id: number
  top: string
  dur: string
  delay: string
}

const CLOUD_COUNT = 3
const SEED_BY_VARIANT: Record<CloudVariant, number> = {
  warm: 113,
  cool: 207,
  cold: 313,
}

export function CloudDrift({ variant }: CloudDriftProps) {
  const clouds = useMemo<Cloud[]>(() => {
    const r = mulberry32(SEED_BY_VARIANT[variant])
    const out: Cloud[] = []
    for (let i = 0; i < CLOUD_COUNT; i++) {
      out.push({
        id: i,
        top: (5 + r() * 65).toFixed(0) + '%',
        dur: (40 + r() * 30).toFixed(2) + 's',
        delay: (-r() * 60).toFixed(2) + 's',
      })
    }
    return out
  }, [variant])

  const variantClass =
    variant === 'cool' ? 'cloud cool' : variant === 'cold' ? 'cloud cold' : 'cloud'

  return (
    <>
      {clouds.map((c) => (
        <div
          key={c.id}
          className={variantClass}
          style={
            {
              '--top': c.top,
              '--dur': c.dur,
              '--delay': c.delay,
            } as CSSProperties
          }
        />
      ))}
    </>
  )
}
