import { useState, useEffect } from 'react'
import { useSettings } from '../store/settings'
import './MetaBar.css'

export function MetaBar() {
  const timeFormat = useSettings((s) => s.timeFormat)
  const [time, setTime] = useState('')

  useEffect(() => {
    function update() {
      const d = new Date()
      const opts: Intl.DateTimeFormatOptions =
        timeFormat === '24'
          ? { hour: '2-digit', minute: '2-digit', hour12: false }
          : { hour: 'numeric', minute: '2-digit', hour12: true }
      setTime(d.toLocaleTimeString(timeFormat === '24' ? 'en-GB' : 'en-US', opts))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [timeFormat])

  return (
    <div className="meta-bar">
      <div>
        <span className="status-dot" />
        SYS.ONLINE
      </div>
      <div>{time || '--:--'}</div>
    </div>
  )
}
