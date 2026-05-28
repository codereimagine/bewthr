import { useSettings, type AnimationMode, type LightningMode } from '../store/settings'
import './SettingsAnimations.css'

const MODES: AnimationMode[] = ['off', 'reduced', 'on']
const LABELS: Record<AnimationMode, string> = {
  off: 'Off',
  reduced: 'Reduced',
  on: 'On',
}

const LIGHTNING_OPTIONS: { value: LightningMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'on', label: 'On' },
]

export function SettingsAnimations() {
  const animations = useSettings((s) => s.animations)
  const lightning = useSettings((s) => s.lightning)
  const updateSetting = useSettings((s) => s.updateSetting)

  return (
    <div className="settings-section">
      <div className="settings-section-title">Animations</div>
      <div className="settings-chip-row" role="radiogroup" aria-label="Animations">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={animations === m}
            className={`settings-chip ${animations === m ? 'active' : ''}`}
            onClick={() => updateSetting('animations', m)}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      <div className="settings-note">
        OS reduce-motion setting overrides this when active.
      </div>

      <div className="settings-toggle-row settings-toggle-row-spaced">
        <div className="settings-toggle-label">Lightning</div>
        <div
          className="settings-chip-row settings-chip-row-bool"
          role="radiogroup"
          aria-label="Lightning"
        >
          {LIGHTNING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={lightning === opt.value}
              className={`settings-chip ${lightning === opt.value ? 'active' : ''}`}
              onClick={() => updateSetting('lightning', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-note">
        Brief flashes during thunderstorms. Off by default — turn on only if you're not photosensitive.
      </div>
    </div>
  )
}
