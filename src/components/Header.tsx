import './Header.css'

interface HeaderProps {
  onOpenPlaces: () => void
  onOpenSettings: () => void
}

export function Header({ onOpenPlaces, onOpenSettings }: HeaderProps) {
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div className="brand-text">be<span>wthr</span></div>
      </div>
      <div className="header-actions">
        <button className="icon-btn" onClick={onOpenPlaces} title="Places">+</button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">{'\u2699'}</button>
      </div>
    </div>
  )
}
