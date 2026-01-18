import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="pa-offline-banner" role="status" aria-live="polite">
      <span className="material-symbols-outlined">wifi_off</span>
      <span>You are offline. Changes are disabled until connection is restored.</span>
    </div>
  )
}
