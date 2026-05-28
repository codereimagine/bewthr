import { useSyncExternalStore } from 'react'
import { useSettings, type AnimationMode } from '../store/settings'

const QUERY = '(prefers-reduced-motion: reduce)'

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

// Subscribes to the OS prefers-reduced-motion media query. Used standalone
// for hazard-class effects (lightning) that warrant unconditional respect of
// the user's OS preference, independent of bewthr's general animation mode.
export function useOsReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// bewthr's animation mode follows the user's app setting only — OS
// reduce-motion no longer clamps ambient effects (cloud drift, rain, snow,
// stars). Manual testing on iOS surfaced that OS-clamping the ambient layer
// suppressed the user's expected weather visualisation entirely. Hazard-class
// animation (lightning) still respects OS reduce-motion via the dedicated
// useOsReducedMotion hook in Atmosphere.tsx.
export function useAnimationMode(): AnimationMode {
  return useSettings((s) => s.animations)
}
