import { useState, useEffect } from 'react'

const STORAGE_KEY = 'admin_photos_hide_empty_galleries'

export function useHideEmptyGalleries() {
  const [hideEmpty, setHideEmptyState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored !== null ? stored === 'true' : true // Default to true
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(hideEmpty))
    } catch {
      // Ignore storage errors
    }
  }, [hideEmpty])

  return {
    hideEmpty,
    setHideEmpty: setHideEmptyState,
  }
}
