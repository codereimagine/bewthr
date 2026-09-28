import type { ConstellationInfo } from '../lib/constellations'
import { useSettings } from '../store/settings'
import { SkyStarGlyph } from './SkyStarGlyph'

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
  const imagined = useSettings((s) => s.accentMode) === 'imagined'
  return (
    <div className="sky-group">
      <div className="sky-group-title">Constellations Overhead</div>
      {constellations.length === 0 ? (
        <div className="sky-empty">None above horizon</div>
      ) : (
        constellations.map((c) =>
          imagined ? (
            <div key={c.name} className="sky-row sky-row--glyph">
              <SkyStarGlyph kind="constellation" name={c.name} />
              <div className="sky-row-main">
                <div className="sky-row-name">{c.name}</div>
                <div className="sky-row-sub">{STATE_LABEL[c.state]}</div>
              </div>
              <div className="sky-row-dir">{c.direction}</div>
            </div>
          ) : (
            <div key={c.name} className="sky-row">
              <div className="sky-row-name">{c.name}</div>
              <div className="sky-row-dir">{c.direction}</div>
              <div className={`sky-row-meta ${c.state === 'high' ? 'bright' : c.state === 'setting' ? 'dim' : ''}`}>
                {STATE_LABEL[c.state]}
              </div>
            </div>
          )
        )
      )}
    </div>
  )
}
