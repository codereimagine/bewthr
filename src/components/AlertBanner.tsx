import { useState, type KeyboardEvent } from 'react'
import { reflowNwsText, type NWSAlert } from '../lib/nws'
import { Modal } from './Modal'
import './AlertBanner.css'

interface AlertBannerProps {
  alerts: NWSAlert[]
  // Continuum is one fixed screen: a full alert growing in place pushed the 24h slider and Play off it.
  // `sheet` keeps the card compact (no headline) and opens the full alert in the shared Modal sheet.
  sheet?: boolean
}

export function AlertBanner({ alerts, sheet = false }: AlertBannerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (alerts.length === 0) return null
  const open = sheet ? alerts.find((a) => a.id === expandedId) : undefined

  return (
    <>
      {alerts.map((alert) => {
        const expanded = expandedId === alert.id
        const severityClass = `severity-${alert.severity.toLowerCase()}`
        const expires = new Date(alert.expires)
        const expiresStr = expires.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })

        return (
          <div key={alert.id} className={`alert-banner ${severityClass} fade-in`}>
            {/* The whole visible card toggles — people tap the title or headline, not the thin top row.
                The expanded details stay outside it, so scrolling them never collapses the card. */}
            <div
              className="alert-tap"
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={() => setExpandedId(expanded ? null : alert.id)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedId(expanded ? null : alert.id)
                }
              }}
            >
              <div className="alert-header">
                <span className="alert-severity">{alert.severity}</span>
                <span className="alert-expires">Until {expiresStr}</span>
              </div>
              <div className="alert-event">{alert.event}</div>
              {!sheet && <div className="alert-headline">{alert.headline}</div>}
            </div>
            {expanded && !sheet && (
              <div className="alert-details">
                <div className="alert-description">{reflowNwsText(alert.description)}</div>
                {alert.instruction && (
                  <div className="alert-instruction">{reflowNwsText(alert.instruction)}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {sheet && (
        <Modal open={!!open} title={open?.event ?? ''} onClose={() => setExpandedId(null)}>
          {open && (
            <div className="alert-details alert-details--sheet">
              <div className="alert-headline">{open.headline}</div>
              <div className="alert-description">{reflowNwsText(open.description)}</div>
              {open.instruction && <div className="alert-instruction">{reflowNwsText(open.instruction)}</div>}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
