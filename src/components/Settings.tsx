import {
  useSettings,
  type Theme,
  type UnitSystem,
  type TempUnit,
  type WindUnit,
  type PressureUnit,
  type TimeFormat,
} from '../store/settings'
import { usePwaUpdate } from '../lib/PwaUpdate'
import { SettingsAnimations } from './SettingsAnimations'
import './SettingsAnimations.css'

const THEMES: { value: Theme; label: string; glyph: string }[] = [
  { value: 'dark', label: 'Dark', glyph: '\u{1F319}' },
  { value: 'light', label: 'Light', glyph: '☀️' },
  { value: 'night', label: 'Night', glyph: '\u{1F311}' },
  { value: 'auto', label: 'Auto', glyph: '\u{1F317}' },
]

const SYSTEMS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'Imperial' },
  { value: 'metric', label: 'Metric' },
]

const TEMP_UNITS: { value: TempUnit; label: string }[] = [
  { value: 'F', label: '°F' },
  { value: 'C', label: '°C' },
]

const WIND_UNITS: { value: WindUnit; label: string }[] = [
  { value: 'mph', label: 'mph' },
  { value: 'kmh', label: 'km/h' },
  { value: 'ms', label: 'm/s' },
  { value: 'kn', label: 'kn' },
]

const PRESSURE_UNITS: { value: PressureUnit; label: string }[] = [
  { value: 'inHg', label: 'inHg' },
  { value: 'hPa', label: 'hPa' },
  { value: 'mb', label: 'mb' },
]

const TIME_FORMATS: { value: TimeFormat; label: string }[] = [
  { value: '12', label: '12h' },
  { value: '24', label: '24h' },
]

const REFRESH_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '5m' },
  { value: 10, label: '10m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '60m' },
]

interface ChipRowProps<T extends string | number> {
  label?: string
  ariaLabel: string
  options: { value: T; label: string; glyph?: string }[]
  value: T
  onChange: (v: T) => void
}

function ChipRow<T extends string | number>({
  label,
  ariaLabel,
  options,
  value,
  onChange,
}: ChipRowProps<T>) {
  return (
    <div className="settings-group">
      {label && <div className="settings-group-label">{label}</div>}
      <div className="settings-chip-row" role="radiogroup" aria-label={ariaLabel}>
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`settings-chip ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.glyph && <span className="settings-chip-glyph">{opt.glyph}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const BOOL_OPTIONS: { value: boolean; label: string }[] = [
  { value: false, label: 'Off' },
  { value: true, label: 'On' },
]

interface ToggleRowProps {
  label: string
  ariaLabel: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, ariaLabel, value, onChange }: ToggleRowProps) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-label">{label}</div>
      <div className="settings-chip-row settings-chip-row-bool" role="radiogroup" aria-label={ariaLabel}>
        {BOOL_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            className={`settings-chip ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function UpdatesSection() {
  const { checkForUpdates, checkResult } = usePwaUpdate()
  const checking = checkResult === 'checking'

  let buttonLabel = 'Check for updates'
  if (checking) buttonLabel = 'Checking…'

  let note: string | null = null
  if (checkResult === 'up-to-date') note = "You're up to date"
  else if (checkResult === 'found') note = 'New version found — close Settings to refresh'
  else if (checkResult === 'error') note = "Couldn't check right now"

  return (
    <div className="settings-section">
      <div className="settings-section-title">Updates</div>
      <button
        type="button"
        className="settings-update-check"
        onClick={() => void checkForUpdates()}
        disabled={checking}
        aria-busy={checking}
      >
        {buttonLabel}
      </button>
      {note && <div className="settings-update-note">{note}</div>}
    </div>
  )
}

export function Settings() {
  const settings = useSettings()

  return (
    <>
      <div className="settings-section">
        <div className="settings-section-title">Appearance</div>
        <ChipRow<Theme>
          label="Theme"
          ariaLabel="Theme"
          options={THEMES}
          value={settings.theme}
          onChange={settings.setTheme}
        />
        <div className="settings-note">
          Auto follows OS preference. Night is a deeper palette for actual night use.
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Units</div>
        <ChipRow<UnitSystem>
          label="System"
          ariaLabel="Unit system"
          options={SYSTEMS}
          value={settings.unitSystem}
          onChange={settings.setUnits}
        />
        <ChipRow<TempUnit>
          label="Temperature"
          ariaLabel="Temperature unit"
          options={TEMP_UNITS}
          value={settings.tempUnit}
          onChange={(v) => settings.updateSetting('tempUnit', v)}
        />
        <ChipRow<WindUnit>
          label="Wind"
          ariaLabel="Wind unit"
          options={WIND_UNITS}
          value={settings.windUnit}
          onChange={(v) => settings.updateSetting('windUnit', v)}
        />
        <ChipRow<PressureUnit>
          label="Pressure"
          ariaLabel="Pressure unit"
          options={PRESSURE_UNITS}
          value={settings.pressureUnit}
          onChange={(v) => settings.updateSetting('pressureUnit', v)}
        />
        <div className="settings-note">
          System preset bulk-sets temp, wind, and pressure. Override each unit individually as needed.
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Time format</div>
        <ChipRow<TimeFormat>
          ariaLabel="Time format"
          options={TIME_FORMATS}
          value={settings.timeFormat}
          onChange={(v) => settings.updateSetting('timeFormat', v)}
        />
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Sections</div>
        <ToggleRow
          label="Hourly forecast"
          ariaLabel="Hourly forecast"
          value={settings.showHourly}
          onChange={(v) => settings.updateSetting('showHourly', v)}
        />
        <ToggleRow
          label="Daily forecast"
          ariaLabel="Daily forecast"
          value={settings.showDaily}
          onChange={(v) => settings.updateSetting('showDaily', v)}
        />
        <ToggleRow
          label="Metrics bar"
          ariaLabel="Metrics bar"
          value={settings.showMetrics}
          onChange={(v) => settings.updateSetting('showMetrics', v)}
        />
        <ToggleRow
          label="Sky tonight"
          ariaLabel="Sky tonight"
          value={settings.showSky}
          onChange={(v) => settings.updateSetting('showSky', v)}
        />
      </div>

      <SettingsAnimations />

      <div className="settings-section">
        <div className="settings-section-title">Data</div>
        <ChipRow<number>
          label="Refresh interval"
          ariaLabel="Refresh interval"
          options={REFRESH_OPTIONS}
          value={settings.refreshMinutes}
          onChange={(v) => settings.updateSetting('refreshMinutes', v)}
        />
        <div className="settings-note">
          How often weather data refreshes while the tab is visible.
        </div>
      </div>

      <UpdatesSection />

      <div className="settings-section">
        <div className="settings-section-title">Reset</div>
        <button type="button" className="settings-reset" onClick={settings.resetDefaults}>
          Reset all settings to defaults
        </button>
      </div>
    </>
  )
}
