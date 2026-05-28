import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Result of a Settings-initiated "Check for updates" tap.
// Drives the inline message under the button.
//   idle       → no recent check, no message
//   checking   → request in flight
//   up-to-date → .update() found no waiting worker
//   found      → .update() (or a background fetch) revealed a waiting SW
//   error      → registration missing or .update() threw
export type CheckResult = 'idle' | 'checking' | 'up-to-date' | 'found' | 'error'

interface PwaUpdateContextValue {
  // True once the new SW is installed and waiting. Drives the banner.
  // Note: "available" is the hook's needRefresh; "visible" also requires
  // !dismissed.
  available: boolean
  bannerVisible: boolean
  dismiss: () => void
  refreshNow: () => void
  checkForUpdates: () => Promise<void>
  checkResult: CheckResult
}

const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null)

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      registrationRef.current = r ?? null
    },
  })

  // Session-only dismiss flag. Reload reopens the banner if needRefresh
  // is still true — that's user-initiated, not nag.
  const [dismissed, setDismissed] = useState(false)
  const [checkResult, setCheckResult] = useState<CheckResult>('idle')

  // Auto-clear the up-to-date / error inline messages after a beat.
  useEffect(() => {
    if (checkResult === 'up-to-date' || checkResult === 'error') {
      const t = window.setTimeout(() => setCheckResult('idle'), 3000)
      return () => window.clearTimeout(t)
    }
  }, [checkResult])

  const dismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  const refreshNow = useCallback(() => {
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  const checkForUpdates = useCallback(async () => {
    const reg = registrationRef.current
    if (!reg) {
      setCheckResult('error')
      return
    }
    setCheckResult('checking')
    try {
      await reg.update()
      // Give the install event time to land before reading .waiting.
      await new Promise((r) => window.setTimeout(r, 500))
      if (reg.waiting) {
        // Manual pull found an update — un-dismiss so the banner is
        // visible after Settings closes (same banner/refresh flow).
        setDismissed(false)
        setNeedRefresh(true)
        setCheckResult('found')
      } else {
        setCheckResult('up-to-date')
      }
    } catch {
      setCheckResult('error')
    }
  }, [setNeedRefresh])

  const value: PwaUpdateContextValue = {
    available: needRefresh,
    bannerVisible: needRefresh && !dismissed,
    dismiss,
    refreshNow,
    checkForUpdates,
    checkResult,
  }

  return <PwaUpdateContext.Provider value={value}>{children}</PwaUpdateContext.Provider>
}

export function usePwaUpdate(): PwaUpdateContextValue {
  const ctx = useContext(PwaUpdateContext)
  if (!ctx) {
    throw new Error('usePwaUpdate must be used inside PwaUpdateProvider')
  }
  return ctx
}
