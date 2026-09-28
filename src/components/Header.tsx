import { useGeo } from '../store/geo'
import './Header.css'

interface HeaderProps {
  onOpenPlaces: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenPlaces, onOpenSettings }: HeaderProps) {
  const loading = useGeo((s) => s.loading)
  const enabled = useGeo((s) => s.enabled)
  const setEnabled = useGeo((s) => s.setEnabled)
  const requestLocation = useGeo((s) => s.requestLocation)

  // One-tap locate: turn location on if it's off (which acquires), else re-acquire.
  // The tap is the user gesture browsers require; falls back to network if GPS is blocked.
  const locate = () => {
    if (!enabled) setEnabled(true)
    else requestLocation()
  }

  return (
    <div className="header">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div className="brand-text">be<span>wthr</span></div>
      </div>
      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={locate}
          disabled={loading}
          aria-busy={loading}
          title="Use my location"
          aria-label="Use my location"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onOpenPlaces} title="Places">+</button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">{'⚙'}</button>
      </div>
    </div>
  )
}
