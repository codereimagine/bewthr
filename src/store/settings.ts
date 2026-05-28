import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light' | 'night' | 'auto'
export type TempUnit = 'F' | 'C'
export type WindUnit = 'mph' | 'kmh' | 'ms' | 'kn'
export type PressureUnit = 'inHg' | 'hPa' | 'mb'
export type TimeFormat = '12' | '24'
export type UnitSystem = 'imperial' | 'metric'
export type AnimationMode = 'off' | 'reduced' | 'on'
export type LightningMode = 'off' | 'on'

interface SettingsState {
  theme: Theme
  tempUnit: TempUnit
  windUnit: WindUnit
  pressureUnit: PressureUnit
  timeFormat: TimeFormat
  unitSystem: UnitSystem
  showHourly: boolean
  showDaily: boolean
  showMetrics: boolean
  showSky: boolean
  animations: AnimationMode
  lightning: LightningMode
  refreshMinutes: number
  setTheme: (theme: Theme) => void
  setUnits: (system: UnitSystem) => void
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  resetDefaults: () => void
}

const DEFAULTS = {
  theme: 'dark' as Theme,
  tempUnit: 'F' as TempUnit,
  windUnit: 'mph' as WindUnit,
  pressureUnit: 'inHg' as PressureUnit,
  timeFormat: '12' as TimeFormat,
  unitSystem: 'imperial' as UnitSystem,
  showHourly: true,
  showDaily: true,
  showMetrics: true,
  showSky: true,
  animations: 'on' as AnimationMode,
  lightning: 'off' as LightningMode,
  refreshMinutes: 15,
}

// Allowlists for runtime validation of persisted state. Tampered or stale
// localStorage values that fall outside these sets coerce to DEFAULTS rather
// than flowing into URL parameters or className interpolations downstream.
const VALID_THEMES: readonly Theme[] = ['dark', 'light', 'night', 'auto']
const VALID_TEMP_UNITS: readonly TempUnit[] = ['F', 'C']
const VALID_WIND_UNITS: readonly WindUnit[] = ['mph', 'kmh', 'ms', 'kn']
const VALID_PRESSURE_UNITS: readonly PressureUnit[] = ['inHg', 'hPa', 'mb']
const VALID_TIME_FORMATS: readonly TimeFormat[] = ['12', '24']
const VALID_UNIT_SYSTEMS: readonly UnitSystem[] = ['imperial', 'metric']
const VALID_ANIMATIONS: readonly AnimationMode[] = ['off', 'reduced', 'on']
const VALID_LIGHTNING: readonly LightningMode[] = ['off', 'on']
const REFRESH_MIN = 0
const REFRESH_MAX = 1440

function pickEnum<T extends string>(value: unknown, valid: readonly T[], fallback: T): T {
  return typeof value === 'string' && (valid as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pickRefreshMinutes(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  if (value < REFRESH_MIN || value > REFRESH_MAX) return fallback
  return value
}

function sanitizePersisted(raw: unknown): Partial<SettingsState> {
  if (!raw || typeof raw !== 'object') return {}
  const r = raw as Record<string, unknown>
  return {
    theme: pickEnum(r.theme, VALID_THEMES, DEFAULTS.theme),
    tempUnit: pickEnum(r.tempUnit, VALID_TEMP_UNITS, DEFAULTS.tempUnit),
    windUnit: pickEnum(r.windUnit, VALID_WIND_UNITS, DEFAULTS.windUnit),
    pressureUnit: pickEnum(r.pressureUnit, VALID_PRESSURE_UNITS, DEFAULTS.pressureUnit),
    timeFormat: pickEnum(r.timeFormat, VALID_TIME_FORMATS, DEFAULTS.timeFormat),
    unitSystem: pickEnum(r.unitSystem, VALID_UNIT_SYSTEMS, DEFAULTS.unitSystem),
    showHourly: pickBool(r.showHourly, DEFAULTS.showHourly),
    showDaily: pickBool(r.showDaily, DEFAULTS.showDaily),
    showMetrics: pickBool(r.showMetrics, DEFAULTS.showMetrics),
    showSky: pickBool(r.showSky, DEFAULTS.showSky),
    animations: pickEnum(r.animations, VALID_ANIMATIONS, DEFAULTS.animations),
    lightning: pickEnum(r.lightning, VALID_LIGHTNING, DEFAULTS.lightning),
    refreshMinutes: pickRefreshMinutes(r.refreshMinutes, DEFAULTS.refreshMinutes),
  }
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'auto', 'night')
  if (theme === 'light') root.classList.add('light')
  else if (theme === 'auto') root.classList.add('auto')
  else if (theme === 'night') root.classList.add('night')
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      setUnits: (system) => {
        if (system === 'imperial') {
          set({ unitSystem: system, tempUnit: 'F', windUnit: 'mph', pressureUnit: 'inHg' })
        } else {
          set({ unitSystem: system, tempUnit: 'C', windUnit: 'kmh', pressureUnit: 'hPa' })
        }
      },

      updateSetting: (key, value) => set({ [key]: value }),

      resetDefaults: () => {
        applyTheme(DEFAULTS.theme)
        set({ ...DEFAULTS })
      },
    }),
    {
      name: 'bewthr_config_v1',
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
    }
  )
)
