/**
 * Offline Detection Hook
 * 
 * Detects when the browser is offline and provides retry functionality
 */

import { useState, useEffect } from 'react'

export interface UseOfflineResult {
  isOffline: boolean
  isOnline: boolean
  retry: () => void
}

export function useOffline(): UseOfflineResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)


  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setRetryCount(0)
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const retry = () => {
    // Force a re-check of online status
    setIsOffline(!navigator.onLine)
  }

  return {
    isOffline,
    isOnline: !isOffline,
    retry,
  }
}
