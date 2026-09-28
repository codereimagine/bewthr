import type { PlanetInfo } from '../lib/astronomy'
import { useSettings } from '../store/settings'
import { SkyStarGlyph } from './SkyStarGlyph'

interface SkyPlanetsProps {
  planets: PlanetInfo[]
}

const BRIGHT_LABEL: Record<PlanetInfo['brightness'], string> = {
  bright: 'Bright',
  moderate: 'Moderate',
  dim: 'Dim',
}

export function SkyPlanets({ planets }: SkyPlanetsProps) {
  const imagined = useSettings((s) => s.accentMode) === 'imagined'
  const visible = planets
    .filter((p) => p.aboveHorizon)
    .sort((a, b) => a.magnitude - b.magnitude)

  return (
    <div className="sky-group">
      <div className="sky-group-title">Planets</div>
      {visible.length === 0 ? (
        <div className="sky-empty">None above horizon</div>
      ) : (
        visible.map((p) =>
          imagined ? (
            <div key={p.name} className="sky-row sky-row--glyph">
              <SkyStarGlyph kind="planet" name={p.name} brightness={p.brightness} />
              <div className="sky-row-main">
                <div className="sky-row-name">{p.name}</div>
                <div className="sky-row-sub">{BRIGHT_LABEL[p.brightness]} · {p.state}</div>
              </div>
              <div className="sky-row-dir">{p.direction}</div>
            </div>
          ) : (
            <div key={p.name} className="sky-row">
              <div className="sky-row-name">{p.name}</div>
              <div className="sky-row-dir">{p.direction}</div>
              <div className={`sky-row-meta ${p.brightness === 'bright' ? 'bright' : p.brightness === 'dim' ? 'dim' : ''}`}>
                {BRIGHT_LABEL[p.brightness]} · {p.state}
              </div>
            </div>
          )
        )
      )}
    </div>
  )
}
