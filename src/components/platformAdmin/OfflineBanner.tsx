/**
 * Offline Banner Component
 * 
 * Displays a banner when the user is offline.
 * Standardized component for consistent offline UI across platform admin pages.
 */

import { useOffline } from '../../hooks/useOffline'

export default function OfflineBanner() {
  const { isOffline } = useOffline()

  if (!isOffline) return null

  return (
    <div
      className="pa-card pa-mb-4"
      style={{
        background: 'var(--pa-warning-bg)',
        border: '1px solid var(--pa-warning)',
        padding: 'var(--pa-space-3)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="pa-flex pa-items-center pa-gap-2">
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>
          wifi_off
        </span>
        <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
          You appear to be offline. Some features may not be available.
        </span>
      </div>
    </div>
  )
}