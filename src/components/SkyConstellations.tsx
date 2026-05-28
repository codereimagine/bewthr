import type { ConstellationInfo } from '../lib/constellations'

interface SkyConstellationsProps {
  constellations: ConstellationInfo[]
}

const STATE_LABEL: Record<ConstellationInfo['state'], string> = {
  rising: 'Rising',
  low: 'Low',
  mid: 'Mid',
  high: 'High',
  setting: 'Setting',
}

export function SkyConstellations({ constellations }: SkyConstellationsProps) {
  return (
    <div className="sky-group">
      <div className="sky-group-title">Constellations Overhead</div>
      {constellations.length === 0 ? (
        <div className="sky-empty">None above horizon</div>
      ) : (
        constellations.map((c) => (
          <div key={c.name} className="sky-row">
            <div className="sky-row-name">{c.name}</div>
            <div className="sky-row-dir">{c.direction}</div>
            <div className={`sky-row-meta ${c.state === 'high' ? 'bright' : c.state === 'setting' ? 'dim' : ''}`}>
              {STATE_LABEL[c.state]}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
