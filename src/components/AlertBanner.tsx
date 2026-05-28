import { useState, type KeyboardEvent } from 'react'
import type { NWSAlert } from '../lib/nws'
import './AlertBanner.css'

interface AlertBannerProps {
  alerts: NWSAlert[]
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (alerts.length === 0) return null

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
            <div
              className="alert-header"
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(expanded ? null : alert.id)}
              onKeyDown={(e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpandedId(expanded ? null : alert.id)
                }
              }}
            >
              <span className="alert-severity">{alert.severity}</span>
              <span className="alert-expires">Until {expiresStr}</span>
            </div>
            <div className="alert-event">{alert.event}</div>
            <div className="alert-headline">{alert.headline}</div>
            {expanded && (
              <div className="alert-details">
                <div className="alert-description">{alert.description}</div>
                {alert.instruction && (
                  <div className="alert-instruction">{alert.instruction}</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
